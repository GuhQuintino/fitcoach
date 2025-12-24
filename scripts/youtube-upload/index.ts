import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline-sync';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
const envLocalPath = path.resolve(__dirname, '../../.env.local');

dotenv.config({ path: envPath });
dotenv.config({ path: envLocalPath }); // Load local override/additional
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY; // Prefer service key if available for updates, but anon might work if RLS allows or we use service role

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_KEY) must be set in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VIDEOS_DIR = path.resolve(__dirname, '../../public/exercises/hevy');
const CREDENTIALS_PATH = path.join(__dirname, 'client_secrets.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const PROCESSED_PATH = path.join(__dirname, 'processed.json');

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

interface ProcessedFile {
    file: string;
    youtubeId: string;
    youtubeUrl: string;
    dbUpdated: boolean;
}

function loadProcessed(): Record<string, ProcessedFile> {
    if (fs.existsSync(PROCESSED_PATH)) {
        return JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf-8'));
    }
    return {};
}

function saveProcessed(data: Record<string, ProcessedFile>) {
    fs.writeFileSync(PROCESSED_PATH, JSON.stringify(data, null, 2));
}

async function authorize() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error(`Error: ${CREDENTIALS_PATH} not found. Please download it from Google Cloud Console.`);
        process.exit(1);
    }
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    const credentials = JSON.parse(content);
    // Handle different formats of client_secrets.json
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris ? redirect_uris[0] : 'http://localhost');

    if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH, 'utf-8');
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    }

    return getNewToken(oAuth2Client);
}

async function getNewToken(oAuth2Client: any) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const code = readline.question('Enter the code from that page here: ');
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Token stored to', TOKEN_PATH);
    return oAuth2Client;
}

async function uploadVideo(auth: any, filePath: string, title: string) {
    const service = google.youtube({ version: 'v3', auth });
    const fileSize = fs.statSync(filePath).size;

    console.log(`Uploading ${title}...`);

    try {
        const res = await service.videos.insert({
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title: `${title} #Shorts`,
                    description: 'Exercise video for FitCoach app #Shorts',
                },
                status: {
                    privacyStatus: 'unlisted', // Important: Unlisted
                    selfDeclaredMadeForKids: false,
                },
            },
            media: {
                body: fs.createReadStream(filePath),
            },
        });
        console.log(`Uploaded! ID: ${res.data.id}`);
        return res.data;
    } catch (err) {
        console.error('The API returned an error: ' + err);
        throw err;
    }
}

async function updateDatabase(videoFileName: string, youtubeUrl: string) {
    // Search for the exercise that uses this file
    // We try to match by the path stored in DB.
    // The DB stores paths like "/exercises/hevy/video.mp4"

    const searchPath = `/exercises/hevy/${videoFileName}`;

    console.log(`Searching for exercise with video_url ending in: ${videoFileName}`);

    // First, find the exercise(s)
    const { data: exercises, error: searchError } = await supabase
        .from('exercises')
        .select('id, name, video_url')
        .ilike('video_url', `%${videoFileName}`);

    if (searchError) {
        console.error('Error finding exercise:', searchError);
        return false;
    }

    if (!exercises || exercises.length === 0) {
        console.log(`No exercise found for file ${videoFileName}`);
        return false;
    }

    let success = true;
    for (const ex of exercises) {
        console.log(`Updating exercise: ${ex.name} (${ex.id})`);
        const { error: updateError } = await supabase
            .from('exercises')
            .update({ video_url: youtubeUrl })
            .eq('id', ex.id);

        if (updateError) {
            console.error(`Failed to update ${ex.name}:`, updateError);
            success = false;
        } else {
            console.log(`Successfully updated ${ex.name}`);
            // Append to SQL file as backup/primary method if RLS fails
            const sql = `UPDATE exercises SET video_url = '${youtubeUrl.replace("watch?v=", "shorts/")}' WHERE id = '${ex.id}';\n`;
            fs.appendFileSync(path.join(__dirname, 'updates.sql'), sql);
        }
    }
    return success;
}

async function main() {
    const auth = await authorize();
    const processed = loadProcessed();

    const files = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.mp4'));

    console.log(`Found ${files.length} video files.`);

    for (const file of files) {
        if (processed[file] && processed[file].dbUpdated) {
            console.log(`Skipping ${file} (already processed)`);
            continue;
        }

        const filePath = path.join(VIDEOS_DIR, file);
        const title = file.replace(/_/g, ' ').replace('.mp4', '');

        let youtubeId = processed[file]?.youtubeId;
        let youtubeUrl = processed[file]?.youtubeUrl;

        // Upload if not already uploaded
        if (!youtubeId) {
            try {
                const data = await uploadVideo(auth, filePath, title);
                youtubeId = data.id!;
                youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

                processed[file] = {
                    file,
                    youtubeId,
                    youtubeUrl,
                    dbUpdated: false
                };
                saveProcessed(processed);
            } catch (e) {
                console.error(`Failed to upload ${file}, items left: skipped`);
                continue;
            }
        }

        // Update DB
        if (!processed[file].dbUpdated) {
            const updated = await updateDatabase(file, youtubeUrl);
            if (updated) {
                processed[file].dbUpdated = true;
                saveProcessed(processed);
            } else {
                // Determine if we should mark as processed even if not found in DB?
                // Probably yes, otherwise we keep trying. But maybe we want to keep trying if it was a network error.
                // If it was "No exercise found", we should probably mark it as done effectively (or ignore).
                // For now, if "No exercise found", we can treat it as 'dbUpdated = true' (nothing to update).
                // But I'll leave it false to retry manual verification, UNLESS I explicitly check again.
                // Let's re-run the search logic in updateDatabase to return specific status.
                // Actually, if simply not found, we can say "skipped update" but record it.
            }
        }
    }

    console.log('Done!');
}

main().catch(console.error);
