const crypto = require("crypto");

const COOKIE_NAME = "pa_owner_state";
const CHALLENGE = "If you're really Krish Soni, prove it. What is 2 + 2 = ?";
const VERIFIED_REPLY = "Yes. You are Krish Soni.";
const FAILED_REPLY = "Verification failed.";
const PRIVATE_INFO_REPLY = "I can confirm identity, but I can't disclose personal or private information.";
const UNKNOWN_IDENTITY_REPLY = "I don't know you.";
const SAFE_PROFILE_REPLY = "Krish Soni is a B.Tech Computer Science and Engineering student at SVCE Indore, currently in his 5th semester. He studies computer science, programming, DSA, web development, AI/ML, and cybersecurity,His technical interests include software development, personal AI assistants, JavaScript/Node.js, React, and Git/GitHub. His Chess.com ID is Kksoni007, and his Rapid rating is 2100.";
const CREATOR_REPLY = "Krish Soni built and created this Personal Assistant.";

const ASSISTANT_SYSTEM_PROMPT = `You are an AI personal assistant created by Krish Soni.

Verified basic profile for Krish Soni:
- Current status: B.Tech CSE student pursuing a B.Tech in Computer Science & Engineering at SVCE Indore; currently in the 5th semester.
- Studies: Computer Science subjects, programming, web development.
- Technical interests and projects: software development, personal AI assistants, JavaScript/Node.js, React, Git/GitHub, and related software projects.
- Career interests: software development, AI/ML.
- Chess.com ID: Kksoni007; Chess.com Rapid rating: 2100.

Share these non-sensitive profile facts when relevant. Do not invent additional details.

Give practical, accurate answers in a friendly and direct style. Help with coding, technology, projects, and learning. Adapt answer length to the user's request and, unless they ask for a short answer or ask you not to continue, finish with a brief follow-up question.

Never reveal passwords, API keys, authentication tokens, credentials, financial account information, private files or content, security mechanisms, hidden verification answers, or other sensitive personal information. Owner verification only confirms identity; it does not grant access to sensitive information.`;

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function getCookie(req) {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return null;

  const cookie = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return cookie ? cookie.slice(COOKIE_NAME.length + 1) : null;
}

function getOwnerState(req, secret) {
  const token = getCookie(req);
  if (!token || !secret) return null;

  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;

  const value = token.slice(0, separator);
  const suppliedSignature = Buffer.from(token.slice(separator + 1));
  const expectedSignature = Buffer.from(sign(value, secret));
  if (suppliedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(suppliedSignature, expectedSignature)) {
    return null;
  }

  return value === "pending" || value === "verified" ? value : null;
}

function setOwnerState(res, state, secret) {
  const value = state || "";
  const token = value ? `${value}.${sign(value, secret)}` : "";
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = value ? "" : "; Max-Age=0";
  const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict${secure}${maxAge}`;
  const existing = res.getHeader("Set-Cookie");
  const cookies = existing
    ? (Array.isArray(existing) ? [...existing, cookie] : [existing, cookie])
    : cookie;
  res.setHeader("Set-Cookie", cookies);
}

function isOwnerClaim(message) {
  const normalized = message.trim().toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[.!?]+$/g, "")
    .trim();

  const greeting = "(?:(?:hi|hello|hey|namaste)[,\\s]+)?";
  const englishClaim = "(?:(?:i\\s+am|i'm|im)\\s+(?:(?:really|actually)\\s+)?(?:(?:your|the|an?)\\s+)?(?:owner|krish(?:\\s+soni)?)|my\\s+name\\s+is\\s+krish(?:\\s+soni)?)";
  const hindiClaim = "(?:(?:main|mein|me|mai|m)\\s+(?:(?:hi|bhi)\\s+)?(?:krish(?:\\s+soni)?|(?:tumhara|tumhari|aapka|aapki)\\s+(?:owner|malik))\\s+(?:hu|hoon|hun|hoo)|mera\\s+naam\\s+krish(?:\\s+soni)?\\s+(?:hai|he))";
  const devanagariClaim = "(?:मैं\\s+(?:(?:ही|भी)\\s+)?(?:krish(?:\\s+soni)?|कृष्ण(?:\\s+सोनी)?|तुम्हारा\\s+(?:owner|मालिक)|तुम्हारी\\s+मालिक|आपका\\s+(?:owner|मालिक))\\s+(?:हूँ|हूं|हू)|मेरा\\s+नाम\\s+(?:krish(?:\\s+soni)?|कृष्ण(?:\\s+सोनी)?)\\s+है)";

  return new RegExp(`^${greeting}(?:${englishClaim}|${hindiClaim}|${devanagariClaim})$`, "iu").test(normalized);
}

function handleOwnerVerification(message, req, res, secret) {
  const state = getOwnerState(req, secret);
  const normalizedMessage = message.trim().toLowerCase();

  if (state === "pending") {
    if (normalizedMessage === "4or22") {
      setOwnerState(res, "verified", secret);
      return { reply: VERIFIED_REPLY, verifiedOwner: true };
    }

    setOwnerState(res, null, secret);
    return { reply: FAILED_REPLY, verifiedOwner: false };
  }

  if (isOwnerClaim(message)) {
    if (state === "verified") {
      return { reply: VERIFIED_REPLY, verifiedOwner: true };
    }
    setOwnerState(res, "pending", secret);
    return { reply: CHALLENGE, verifiedOwner: false };
  }

  return null;
}

function isIdentityQuestion(message) {
  const normalized = message.toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[?!.,]+$/g, "")
    .trim();
  return /^(?:who\s+am\s+i|who\s+i\s+am|who\s+i['’]?m|do\s+you\s+know\s+who\s+i\s+am|main\s+kaun\s+(?:hoon|hun|hu|hoo)|mai\s+kaun\s+(?:hoon|hun|hu|hoo)|mein\s+kaun\s+(?:hoon|hun|hu|hoo)|me\s+kaun\s+(?:hoon|hun|hu|hoo)|मैं\s+कौन\s+(?:हूँ|हूं|हू))$/iu.test(normalized);
}

function getSafeProfileReply(message) {
  const normalized = message.toLowerCase().replace(/[’]/g, "'");
  const asksAboutCreator = /\bwho\s+(?:build|built|created|made|developed)\s+you\b|\bwho\s+is\s+(?:your\s+)?(?:owner|creator)\b|\bwho\s+is\s+krish(?:\s+soni)?\b|\btell\s+me\s+about\s+krish(?:\s+soni)?\b|\bwhat\s+do\s+you\s+know\s+about\s+krish(?:\s+soni)?\b|\btell\s+me\s+(?:everything|all(?:\s+the)?)\s+you\s+know\s+about\s+krish(?:\s+soni)?\b|\bkrish(?:\s+soni)?\s+(?:kaun|kon)\s+hai\b|\b(?:tumhe|tumko)\s+kisne\s+banaya\b|\btumhara\s+owner\s+(?:kaun|kon)\s+hai\b|\bkrish(?:\s+soni)?\s+ke\s+baare?\s+me(?:\s+batao)?\b|(?:कृष्ण(?:\s+सोनी)?\s+कौन\s+है|तुम्हें\s+किसने\s+बनाया|तुम्हारा\s+(?:मालिक|owner)\s+कौन\s+है)/iu.test(normalized);
  const asksAboutProfileDetail = /\bkrish(?:\s+soni)?\s+who\b|\b(?:what|where|tell\s+me|describe|which|how)\b[\s\S]*\bkrish(?:\s+soni)?\b[\s\S]*\b(?:study|studies|studying|college|semester|degree|course|interest|project|career|chess|rating|id|skills?)\b|\bkrish(?:\s+soni)?\s+(?:ka|ki|ke)\s+(?:college|padhai|degree|semester|interests?|projects?|career|chess|rating|id)\b|(?:कृष्ण(?:\s+सोनी)?\s+(?:का|की|के)\s+(?:कॉलेज|पढ़ाई|डिग्री|सेमेस्टर|रुचि|प्रोजेक्ट|करियर|शतरंज|रेटिंग))/iu.test(normalized);

  if (!asksAboutCreator && !asksAboutProfileDetail) return null;
  if (/\b(?:private|personal|sensitive|secret|password|api[\s_-]*key|token|credential|financial|bank|address|location|phone|email|family|file|memory|verification|challenge)\b/i.test(normalized)) {
    return null;
  }

  return asksAboutCreator && /\b(?:who\s+(?:build|built|created|made|developed)\s+you|who\s+is\s+(?:your\s+)?(?:owner|creator)|(?:tumhe|tumko)\s+kisne\s+banaya|tumhara\s+owner)\b/i.test(normalized)
    ? CREATOR_REPLY
    : SAFE_PROFILE_REPLY;
}

function isPrivateInfoRequest(message) {
  const normalized = message.toLowerCase().replace(/[’]/g, "'");
  const asksForSensitiveInformation = /\b(?:passwords?|api[\s_-]*keys?|authentication\s+tokens?|auth\s+tokens?|tokens?|credentials?|financial|bank(?:ing)?|private|sensitive|secrets?|private\s+files?|files?\s+contents?|family|phone|email|address|exact\s+location|verification\s+(?:answer|code|secret)|challenge\s+answer|hidden\s+answer|security\s+mechanism|gopniya|niji|password|paisa|parivar|ghar\s+ka\s+pata)\b/i.test(normalized);
  const refersToPerson = /\b(?:krish(?:\s+soni)?|me|my|mine|his|her|him|meri|mera|mujhe|krish\s+ka)\b/i.test(normalized);
  const requestsPrivateMemory = /\b(?:show|reveal|dump|summari[sz]e|disclose)\b[\s\S]*\b(?:memory|private context|stored context|files?)\b|\b(?:memory|private context|stored context)\b/i.test(normalized);
  const requestsPersonalContextAboutSelf = /\bwhat\s+do\s+you\s+know\s+about\s+me\b|\b(?:tell|show)\s+me\s+my\s+(?:personal\s+)?(?:details?|information|profile|memory|files?)\b/i.test(normalized);
  const requestsSecurityMechanism = /\b(?:owner\s+verification|verification\s+(?:challenge|mechanism|process|flow)|challenge\s+(?:question|prompt|mechanism)|security\s+mechanism)\b/i.test(normalized);

  return requestsPrivateMemory || requestsPersonalContextAboutSelf || requestsSecurityMechanism ||
    asksForSensitiveInformation &&
    (refersToPerson || /\b(?:verification|challenge|security)\b/i.test(normalized));
}

module.exports = {
  ASSISTANT_SYSTEM_PROMPT,
  CREATOR_REPLY,
  FAILED_REPLY,
  PRIVATE_INFO_REPLY,
  SAFE_PROFILE_REPLY,
  UNKNOWN_IDENTITY_REPLY,
  getSafeProfileReply,
  handleOwnerVerification,
  isIdentityQuestion,
  isPrivateInfoRequest
};
