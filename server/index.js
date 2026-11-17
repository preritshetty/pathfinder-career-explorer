import 'dotenv/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import express from 'express';
import {GoogleGenAI} from '@google/genai';
import {createApp} from './app.js';
import {createGenerator} from './generation.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const key=process.env.GEMINI_API_KEY?.trim();
const ai=key&&!/^(your_|paste_|replace_)/i.test(key)?new GoogleGenAI({apiKey:key}):null;
const model=process.env.GEMINI_MODEL||'gemini-3.1-flash-lite';
const generate=ai?createGenerator(ai,{model,fallbackModel:process.env.GEMINI_FALLBACK_MODEL||''}):undefined;
// Signing material contains no student data and keeps refresh recovery valid across restarts.
mkdirSync(path.join(root,'.data'),{recursive:true,mode:0o700});
const secretPath=path.join(root,'.data/session-secret');
try{writeFileSync(secretPath,randomBytes(32),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
const app=createApp({generate,secret:readFileSync(secretPath)});
if(process.env.NODE_ENV==='production'){
 app.use(express.static(path.join(root,'dist')));app.get(/.*/,(_req,res)=>res.sendFile(path.join(root,'dist/index.html')));
}
const port=Number(process.env.PORT||3001);
app.listen(port,()=>console.log(`Pathfinder listening on http://localhost:${port}`));
