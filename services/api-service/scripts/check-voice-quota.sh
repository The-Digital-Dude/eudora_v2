#!/usr/bin/env bash
#
# Are the speech and language providers able to answer right now?
#
# Worth checking before showing the story demo to anyone, because both free
# tiers run out in ways that look like bugs rather than billing:
#
#   - Gemini allows 20 requests per DAY per model. Every question a visitor
#     asks is one request. The error's "retryDelay: 24s" is boilerplate and
#     does NOT mean it recovers in a minute. Switch GEMINI_CHAT_MODEL to
#     another model to get a fresh daily allowance.
#   - ElevenLabs allows 10,000 characters per month, which one full story's
#     narration can exhaust on its own. Past that, replies fall back to the
#     slower provider and the voice audibly changes.
#
# Reads keys from .env.docker (what compose actually loads) and never prints
# them. Costs one Gemini request to run.
set -euo pipefail
cd "$(dirname "$0")/.."

read_env() { grep -E "^$1=" .env.docker 2>/dev/null | cut -d= -f2- | tr -d '"\r'; }

GEMINI_KEY=$(read_env GEMINI_API_KEY)
ELEVEN_KEY=$(read_env ELEVEN_LABS_API_KEY)
MODEL=$(read_env GEMINI_CHAT_MODEL)
MODEL=${MODEL:-gemini-3.6-flash}

if [ -z "$GEMINI_KEY" ]; then
  echo "Gemini:     no GEMINI_API_KEY in .env.docker"
else
  curl -s -m 20 "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"role":"user","parts":[{"text":"hi"}]}],"generationConfig":{"maxOutputTokens":300}}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
      const j=JSON.parse(d||'{}');
      const q=(j.error?.details||[]).find(x=>x.violations)?.violations?.[0];
      console.log('Gemini:     ' + (j.error
        ? 'UNAVAILABLE (' + j.error.status + (q? ', limit '+q.quotaValue+'/day' : '') + ') on ' + process.argv[1]
        : 'ready on ' + process.argv[1]));});" "$MODEL"
fi

if [ -z "$ELEVEN_KEY" ]; then
  echo "ElevenLabs: no ELEVEN_LABS_API_KEY in .env.docker"
else
  curl -s -m 20 https://api.elevenlabs.io/v1/user/subscription -H "xi-api-key: ${ELEVEN_KEY}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
      const j=JSON.parse(d||'{}');
      if(j.detail){console.log('ElevenLabs: unavailable');return;}
      const left=j.character_limit-j.character_count;
      console.log('ElevenLabs: '+left+' of '+j.character_limit+' characters left this month ('+j.tier+' plan)');});"
fi
