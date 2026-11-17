// Never return SDK messages: they may contain request URLs, credentials or payloads.
export function classifyAiError(error) {
 const status = Number(error?.status || error?.code);
 const message = String(error?.message || '');
 if(status===429 || /RESOURCE_EXHAUSTED|quota|rate.limit/i.test(message)) return {code:'AI_QUOTA',status:429,reason:'Google’s API quota or rate limit was reached. Your report uses the same computed interests with built-in guidance.'};
 if(status===503 || /UNAVAILABLE|high demand/i.test(message)) return {code:'AI_BUSY',status:503,reason:'Google’s AI service is temporarily busy. Your report uses built-in guidance.'};
 if(status===401 || status===403 || /API_KEY_INVALID|API key not valid|permission denied/i.test(message)) return {code:'AI_ACCESS',status:status||403,reason:'The server’s AI key or project permissions need attention. Your report uses built-in guidance.'};
 if(status===404 || /model.*not found|not supported.*model/i.test(message)) return {code:'AI_MODEL',status:404,reason:'The configured AI model is not available to this project. Your report uses built-in guidance.'};
 if(error instanceof SyntaxError || /Incomplete report|Incomplete plan|Invalid questions|empty response/i.test(message)) return {code:'AI_FORMAT',status:null,reason:'The AI response did not pass the content checks. Your report uses built-in guidance.'};
 if(status===400) return {code:'AI_REQUEST',status:400,reason:'The AI service rejected the generation request. Your report uses built-in guidance.'};
 return {code:'AI_CONNECTION',status:status||null,reason:'The AI request could not be completed. Your report uses built-in guidance.'};
}
export function logAiFailure(stage,error) {
 const diagnostic=classifyAiError(error);
 console.warn(JSON.stringify({event:'ai_fallback',stage,code:diagnostic.code,status:diagnostic.status,time:new Date().toISOString()}));
 return diagnostic;
}
