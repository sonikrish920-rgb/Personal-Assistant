const crypto = require("crypto");

const COOKIE_NAME = "pa_owner_state";
const CHALLENGE = "If you're really Krish Soni, prove it. What is 2 + 2?";
const VERIFIED_REPLY = "Yes. You are Krish Soni.";
const FAILED_REPLY = "Verification failed.";
const PRIVATE_INFO_REPLY = "I can confirm identity, but I can't disclose personal or private information.";

const ASSISTANT_SYSTEM_PROMPT = `You are an AI personal assistant created by Krish Soni.

Give practical, accurate answers in a friendly and direct style. Help with coding, technology, projects, and learning. Adapt answer length to the user's request and, unless they ask for a short answer or ask you not to continue, finish with a brief follow-up question.

Never reveal, infer, summarize, or volunteer personal or private information about Krish Soni or the user, including information from conversation context. Owner verification only confirms identity; it does not grant access to personal information.`;

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
  return /^\s*(?:(?:i\s+am|i['’]m)\s+(?:(?:really|actually)\s+)?(?:(?:your|the|an?)\s+)?(?:owner|krish(?:\s+soni)?)|my\s+name\s+is\s+krish(?:\s+soni)?|main\s+krish(?:\s+soni)?\s+hoon)[.!?]*\s*$/i.test(message);
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

function isPrivateInfoRequest(message) {
  const asksForInformation = /\b(?:what do you know|what is|what['’]s|where|when|who is|how|do you (?:know|have)|tell me|show|list|summari[sz]e|reveal|share|disclose|dump|describe|give me|does|did|can you|could you|would you)\b/i.test(message);
  const targetsKrish = /\bkrish(?:\s+soni)?\b/i.test(message);
  const requestsPrivateDetails = /\b(?:everything|all|personal|private|sensitive|details?|information|data|memory|profile|know|projects?|files?|accounts?|contacts?|locations?|address|education|family|credentials?|secrets?|phone|email|password|age|birthday)\b/i.test(message);
  const targetsUserOrMemory = /\b(?:me|my|memory|profile)\b/i.test(message);

  return (targetsKrish && asksForInformation) ||
    (targetsUserOrMemory && asksForInformation && requestsPrivateDetails);
}

module.exports = {
  ASSISTANT_SYSTEM_PROMPT,
  FAILED_REPLY,
  PRIVATE_INFO_REPLY,
  handleOwnerVerification,
  isPrivateInfoRequest
};
