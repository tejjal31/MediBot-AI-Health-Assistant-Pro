// MediBot AI Edge Function
// Secure backend for symptom analysis & health guidance.
// If an OPENAI_API_KEY (or OPENAI_BASE_URL + key) secret is configured, the
// function proxies to that LLM. Otherwise it falls back to a built-in medical
// NLP engine that classifies symptoms, asks intelligent follow-up questions,
// and returns evidence-based, safety-first guidance. API keys never reach the
// browser.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ReqBody {
  messages: ChatTurn[];
  language?: string;
  sessionRef?: string;
  sessionId?: string;
  sessionTitle?: string;
}

// ---------- Medical knowledge base (fallback engine) ----------

interface SymptomEntry {
  id: string;
  label: string;
  keywords: string[];
  urgency: "low" | "medium" | "high";
  intent: string;
  followUps: string[];
  remedies: string[];
  precautions: string[];
  recovery: string[];
  otcInfo: string;
  redFlags: string[];
}

const KB: SymptomEntry[] = [
  {
    id: "fever",
    label: "Fever",
    keywords: ["fever", "high temperature", "hot", "feverish", "burning up", "chills", "shivering"],
    urgency: "medium",
    intent: "fever",
    followUps: [
      "How long have you had the fever (in days)?",
      "Have you measured your temperature, and if so, what was the reading?",
      "Are you also experiencing chills, body aches, or a sore throat?",
    ],
    remedies: [
      "Stay well hydrated — water, clear broths, and oral rehydration solutions help replace fluids lost to sweating.",
      "Rest in a cool, well-ventilated room and wear light clothing.",
      "A lukewarm (not cold) sponge bath can help bring temperature down comfortably.",
    ],
    precautions: [
      "Do not use cold water or ice baths — they can cause shivering and raise core temperature.",
      "Avoid bundling up in heavy blankets if you're sweating.",
    ],
    recovery: [
      "Most viral fevers resolve within 3–5 days with rest and fluids.",
      "Gradually resume activity once the fever has been gone for 24 hours without medication.",
    ],
    otcInfo:
      "Paracetamol/acetaminophen (e.g., 500 mg every 4–6 hours for adults, max 4 g/day) is commonly used to reduce fever. Always follow package dosing and check for contraindications. This is general information, not a prescription.",
    redFlags: [
      "Temperature above 39.4 °C (103 °F) that doesn't respond to medication",
      "Fever lasting more than 3 days, or returning after subsiding",
      "Stiff neck with severe headache, confusion, or a non-blanching rash",
    ],
  },
  {
    id: "headache",
    label: "Headache",
    keywords: ["headache", "head pain", "migraine", "head ache", "throbbing head", "pressure in head"],
    urgency: "low",
    intent: "headache",
    followUps: [
      "Where is the pain located — one side, both sides, forehead, or back of the head?",
      "How would you rate the pain from 1 to 10?",
      "Is the pain throbbing, pressing, or sharp, and how long have you had it?",
    ],
    remedies: [
      "Rest in a quiet, dark room and apply a cool compress to your forehead or neck.",
      "Stay hydrated — dehydration is a common headache trigger.",
      "Gentle neck and shoulder stretches can relieve tension-type pain.",
    ],
    precautions: [
      "Avoid screen time and bright light during a migraine episode.",
      "Limit caffeine intake, and don't skip meals.",
    ],
    recovery: [
      "Tension headaches often ease within a few hours with rest and hydration.",
      "Track triggers (sleep, stress, foods) to reduce recurrence.",
    ],
    otcInfo:
      "Ibuprofen (200–400 mg for adults) or paracetamol/acetaminophen (500–1000 mg) are commonly used for occasional headaches. Don't use painkillers on more than 10–15 days/month without medical advice. This is general information, not a prescription.",
    redFlags: [
      "Sudden, severe 'thunderclap' headache — the worst of your life",
      "Headache with fever, stiff neck, confusion, or weakness on one side",
      "Headache after a head injury",
    ],
  },
  {
    id: "cough_cold",
    label: "Cough & Cold",
    keywords: ["cough", "cold", "sore throat", "runny nose", "congestion", "sneezing", "stuffy nose", "phlegm"],
    urgency: "low",
    intent: "cough_cold",
    followUps: [
      "Is your cough dry, or are you producing phlegm? What color?",
      "How many days have you had these symptoms?",
      "Do you also have a fever, body aches, or difficulty breathing?",
    ],
    remedies: [
      "Warm fluids — water, tea with honey, or broth — soothe the throat and thin mucus.",
      "Honey (1 teaspoon) can reduce cough frequency in adults and children over 1 year.",
      "Steam inhalation and a humidifier help relieve nasal congestion.",
      "Gargle with warm salt water (1/2 teaspoon salt in a glass of warm water) for sore throat.",
    ],
    precautions: [
      "Never give honey to children under 1 year (risk of infant botulism).",
      "Avoid smoking and secondhand smoke, which irritate airways.",
    ],
    recovery: [
      "Most common colds resolve in 7–10 days; a lingering cough can last up to 3 weeks.",
      "See a doctor if symptoms worsen after initially improving.",
    ],
    otcInfo:
      "Saline nasal sprays and lozenges can ease discomfort. Combination cold medicines may help adults but check ingredients to avoid double-dosing paracetamol. This is general information, not a prescription.",
    redFlags: [
      "Shortness of breath, chest pain, or wheezing",
      "Cough lasting more than 3 weeks, or coughing up blood",
      "High fever with productive, discolored phlegm",
    ],
  },
  {
    id: "stomach",
    label: "Stomach Pain / Digestive",
    keywords: ["stomach pain", "abdominal pain", "stomach ache", "nausea", "vomiting", "diarrhea", "indigestion", "gas", "bloating", "cramps"],
    urgency: "medium",
    intent: "stomach",
    followUps: [
      "Where is the pain — upper abdomen, lower abdomen, or around the navel?",
      "Is the pain sharp, crampy, or burning? Does it come and go?",
      "Are you also experiencing nausea, vomiting, diarrhea, or fever?",
    ],
    remedies: [
      "Sip clear fluids and oral rehydration solution to prevent dehydration, especially with vomiting or diarrhea.",
      "Eat bland, easy-to-digest foods (rice, toast, bananas, applesauce) as tolerated.",
      "Avoid spicy, fatty, or dairy-heavy foods until symptoms settle.",
    ],
    precautions: [
      "Stay hydrated — small, frequent sips are better than large amounts at once.",
      "Avoid alcohol, caffeine, and NSAIDs (ibuprofen) which can irritate the stomach.",
    ],
    recovery: [
      "Most mild digestive upset improves within 1–2 days with rest and fluids.",
      "Gradually reintroduce normal foods once symptoms ease.",
    ],
    otcInfo:
      "Oral rehydration salts help with fluid loss. Antacids can relieve acidity. Avoid anti-diarrheal medicines if you have a high fever or bloody stools without medical advice. This is general information, not a prescription.",
    redFlags: [
      "Severe or worsening abdominal pain",
      "Blood in vomit or stool, or black tarry stools",
      "Persistent vomiting preventing any fluid intake, or signs of dehydration",
    ],
  },
  {
    id: "chest",
    label: "Chest Discomfort",
    keywords: ["chest pain", "chest tightness", "chest pressure", "heart pain", "chest discomfort"],
    urgency: "high",
    intent: "chest",
    followUps: [
      "Is the pain sharp, pressure-like, or burning? Does it spread to your arm, jaw, or back?",
      "Did it come on with exertion or at rest?",
      "Do you have shortness of breath, sweating, or nausea with it?",
    ],
    remedies: [
      "Stop all physical activity and sit down in a comfortable position.",
      "Loosen tight clothing and try to stay calm.",
      "If you've been prescribed nitroglycerin and know how to use it, follow your doctor's instructions.",
    ],
    precautions: [
      "Do not drive yourself to the hospital if you suspect a heart issue — call emergency services.",
      "Avoid eating or drinking until assessed, in case tests or treatment are needed.",
    ],
    recovery: [
      "Chest pain always needs professional evaluation — recovery depends on the cause.",
      "Follow your doctor's plan for medications, activity, and follow-up tests.",
    ],
    otcInfo:
      "Chest pain is not something to self-treat. Some burning chest pain may be acid reflux and can ease with an antacid, but chest pressure with sweating or breathlessness is a medical emergency — call emergency services immediately.",
    redFlags: [
      "Crushing pressure or tightness spreading to arm, jaw, or back, with sweating and breathlessness",
      "Chest pain with fainting or severe dizziness",
      "Any new, unexplained chest pain — seek urgent medical care",
    ],
  },
  {
    id: "anxiety",
    label: "Stress & Anxiety",
    keywords: ["anxiety", "stress", "panic", "worried", "overwhelmed", "can't sleep", "insomnia", "restless", "nervous"],
    urgency: "low",
    intent: "anxiety",
    followUps: [
      "How long have you been feeling this way, and is it tied to a specific situation?",
      "Is it affecting your sleep, appetite, or daily activities?",
      "Have you noticed a racing heart, tightness in the chest, or shortness of breath?",
    ],
    remedies: [
      "Slow breathing: inhale for 4 seconds, hold for 4, exhale for 6 — repeat for 2 minutes.",
      "Regular exercise, even a 20-minute walk, meaningfully reduces anxiety.",
      "Limit caffeine and screen time before bed; keep a consistent sleep schedule.",
      "Journaling or talking to someone you trust can lighten the emotional load.",
    ],
    precautions: [
      "Avoid alcohol and recreational substances to cope — they worsen anxiety long-term.",
      "Don't withdraw from supportive friends and family.",
    ],
    recovery: [
      "Anxiety is very common and treatable. Many people improve with self-care and, when needed, therapy.",
      "If symptoms persist for weeks or interfere with daily life, a mental health professional can help.",
    ],
    otcInfo:
      "There are no over-the-counter medications recommended for anxiety. Effective options include therapy (such as CBT) and, when appropriate, prescription medication from a doctor. This is general information, not a prescription.",
    redFlags: [
      "Thoughts of self-harm or suicide — reach out to a crisis line or emergency services now",
      "Panic attacks with chest tightness that don't settle (rule out cardiac causes)",
      "Persistent symptoms that prevent daily functioning",
    ],
  },
  {
    id: "skin",
    label: "Skin / Rash",
    keywords: ["rash", "itching", "skin", "hives", "eczema", "dry skin", "red spots", "acne"],
    urgency: "low",
    intent: "skin",
    followUps: [
      "Where is the rash, and has it spread?",
      "Is it itchy, painful, or burning? Any blisters or scaling?",
      "How long have you had it, and have you used any new products or foods recently?",
    ],
    remedies: [
      "Apply a cool, damp compress to relieve itching.",
      "Use a fragrance-free moisturizer on dry or irritated skin.",
      "Avoid scratching — it worsens inflammation and risks infection.",
    ],
    precautions: [
      "Identify and avoid likely triggers: new soaps, detergents, foods, or plants.",
      "Use mild, fragrance-free skincare products.",
    ],
    recovery: [
      "Many mild rashes fade within days once the trigger is removed.",
      "Persistent or spreading rashes need a doctor or dermatologist review.",
    ],
    otcInfo:
      "A mild hydrocortisone 1% cream or an oral antihistamine (e.g., cetirizine) can help itchy rashes in adults. Don't use hydrocortisone on the face for more than a few days without advice. This is general information, not a prescription.",
    redFlags: [
      "A rash with fever, or a rash that doesn't fade when pressed",
      "Rapidly spreading rash with swelling of the face, lips, or throat",
      "Blisters, open sores, or signs of infection (pus, increasing pain)",
    ],
  },
  {
    id: "allergy",
    label: "Allergy",
    keywords: ["allergy", "allergic", "sneezing", "itchy eyes", "swelling", "food allergy", "dust allergy", "reaction"],
    urgency: "medium",
    intent: "allergy",
    followUps: ["What may have triggered it — food, medicine, dust, pollen, or an insect bite?", "Do you have a rash, swelling, wheezing, or trouble breathing?", "When did the symptoms begin?"],
    remedies: ["Move away from the suspected trigger and rinse exposed skin with clean water.", "A cool compress can ease itching and swelling.", "Keep a note of possible triggers and when the reaction happens."],
    precautions: ["Do not try a suspected food or medicine again to test it.", "Avoid scratching itchy skin and avoid new skincare products during a reaction."],
    recovery: ["Mild allergy symptoms often improve after the trigger is removed.", "Recurring reactions deserve a review with a healthcare professional."],
    otcInfo: "An oral antihistamine such as cetirizine may help mild allergy symptoms in adults when used exactly as the package directs. This is general information, not a prescription.",
    redFlags: ["Swelling of the lips, tongue, face, or throat", "Wheezing, trouble breathing, faintness, or rapidly worsening symptoms", "A severe reaction after food, medicine, or an insect sting — call emergency services"],
  },
  {
    id: "dizziness",
    label: "Dizziness",
    keywords: ["dizzy", "dizziness", "vertigo", "lightheaded", "light headed", "balance", "spinning"],
    urgency: "medium",
    intent: "dizziness",
    followUps: ["Does the room feel like it is spinning, or do you feel faint?", "Did it start suddenly, and do you have a headache, weakness, or vision changes?", "Have you eaten and had enough fluids today?"],
    remedies: ["Sit or lie down safely until the feeling passes, then stand up slowly.", "Sip water and eat a light snack if you may have skipped a meal.", "Avoid driving, climbing, or operating machinery while dizzy."],
    precautions: ["Do not ignore repeated or worsening episodes.", "Review new medicines with a clinician rather than stopping prescribed medicine yourself."],
    recovery: ["Brief dizziness can occur with dehydration, missed meals, or sudden position changes.", "Repeated dizziness should be assessed to find the cause."],
    otcInfo: "There is no single safe over-the-counter treatment for dizziness because the cause matters. A clinician or pharmacist can guide you.",
    redFlags: ["Sudden dizziness with facial drooping, weakness, trouble speaking, or severe headache", "Fainting, chest pain, severe breathlessness, or an irregular heartbeat", "Dizziness after a serious injury"],
  },
  {
    id: "back_joint",
    label: "Back or Joint Pain",
    keywords: ["back pain", "lower back", "neck pain", "joint pain", "knee pain", "shoulder pain", "muscle pain", "body pain", "sprain"],
    urgency: "low",
    intent: "back_joint",
    followUps: ["Where exactly is the pain, and did it follow an injury or unusual activity?", "How severe is it, and does it travel down an arm or leg?", "Do you have numbness, weakness, fever, or swelling?"],
    remedies: ["Keep gently moving within comfort; prolonged bed rest can make stiffness worse.", "Use a wrapped cold pack for a new injury or warmth for muscle tightness.", "Use supportive posture and avoid lifting until the pain settles."],
    precautions: ["Do not push through severe pain or numbness.", "Follow package directions for any pain medicine and check with a pharmacist if you have other conditions."],
    recovery: ["Many mild strains improve over several days to a few weeks.", "Persistent, recurrent, or limiting pain deserves professional assessment."],
    otcInfo: "Paracetamol/acetaminophen may help some people. Ibuprofen is not suitable for everyone, including some people with ulcers, kidney disease, blood thinners, or pregnancy. Ask a pharmacist if unsure.",
    redFlags: ["New loss of bladder or bowel control, numbness around the groin, or leg weakness", "Severe pain after a fall or accident", "Pain with fever, unexplained weight loss, or a history of cancer"],
  },
  {
    id: "urinary",
    label: "Urinary Symptoms",
    keywords: ["burning urine", "burning when urinating", "urine", "urinary", "uti", "frequent urination", "painful urination", "blood in urine"],
    urgency: "medium",
    intent: "urinary",
    followUps: ["Do you have burning, urgency, or needing to urinate more often?", "Do you have fever, back pain, vomiting, or blood in the urine?", "How long have the symptoms been present?"],
    remedies: ["Drink water regularly unless a clinician has told you to restrict fluids.", "Do not hold urine for long periods.", "Arrange a medical or pharmacy assessment because some urinary infections need prescription treatment."],
    precautions: ["Do not use leftover antibiotics or share antibiotics.", "Seek care sooner if pregnant, immunocompromised, or if symptoms affect a child or older adult."],
    recovery: ["Some mild irritation settles, but an infection can worsen without the right treatment.", "A urine test can help identify the cause."],
    otcInfo: "Pain-relief products may reduce discomfort but do not cure a urinary infection. Antibiotics should only be used when prescribed for you.",
    redFlags: ["Fever with pain in the side or back, vomiting, or feeling very unwell", "Visible blood in urine, inability to urinate, or severe pain", "Symptoms during pregnancy"],
  },
  {
    id: "menstrual",
    label: "Period Symptoms",
    keywords: ["period pain", "period cramps", "menstrual", "menstruation", "pms", "heavy bleeding", "late period", "pregnancy test"],
    urgency: "medium",
    intent: "menstrual",
    followUps: ["When did your last period start, and is this pain or bleeding different from usual?", "How heavy is the bleeding, and are you feeling faint?", "Could you be pregnant, or do you have severe one-sided pain?"],
    remedies: ["A warm compress on the lower abdomen can ease cramps.", "Gentle movement, rest, hydration, and regular meals may help.", "Track bleeding, pain, and cycle timing to share with a clinician."],
    precautions: ["Do not ignore a major change in your usual cycle.", "Check with a clinician or pharmacist before taking anti-inflammatory pain medicine if pregnant or if you have stomach, kidney, or bleeding problems."],
    recovery: ["Typical cramps often improve within the first few days of a period.", "Severe, worsening, or disruptive symptoms deserve evaluation."],
    otcInfo: "Paracetamol/acetaminophen may help. Some people use ibuprofen for cramps, but it is not suitable for everyone and should be avoided in some pregnancy situations. Ask a pharmacist if unsure.",
    redFlags: ["Very heavy bleeding with faintness or soaking a pad every hour", "Severe one-sided pain, shoulder-tip pain, or possible pregnancy", "Sudden severe pain, fever, or unusual discharge"],
  },
  {
    id: "eye",
    label: "Eye Symptoms",
    keywords: ["eye pain", "red eye", "itchy eye", "blurred vision", "eye infection", "pink eye", "watery eyes", "vision"],
    urgency: "medium",
    intent: "eye",
    followUps: ["Is the eye painful, itchy, or producing discharge?", "Is your vision affected, or are you sensitive to light?", "Was there an injury, chemical exposure, or contact-lens use?"],
    remedies: ["Avoid rubbing the eye and wash hands frequently.", "A clean cool compress can ease mild irritation.", "Stop contact lenses until symptoms fully settle and a clinician advises they are safe to resume."],
    precautions: ["Do not use someone else's eye drops or old prescription drops.", "Rinse immediately with clean running water after chemical exposure."],
    recovery: ["Mild irritation can improve after removing the trigger.", "Persistent redness, discharge, pain, or vision change needs an eye-care review."],
    otcInfo: "Lubricating artificial tears may help simple dryness. Avoid redness-relief drops for repeated use without advice.",
    redFlags: ["Sudden vision loss, severe eye pain, or a curtain-like shadow", "Chemical injury, penetrating injury, or significant swelling", "Red painful eye with light sensitivity or contact-lens use"],
  },
];

const GREETING_INTENTS = ["greeting", "thanks", "help", "general"];

function classify(text: string): { entry: SymptomEntry | null; matched: string[] } {
  const lower = text.toLowerCase();
  let best: SymptomEntry | null = null;
  let bestScore = 0;
  const matched: string[] = [];
  for (const entry of KB) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        score += kw.length > 6 ? 3 : 2;
        matched.push(kw);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return { entry: bestScore > 0 ? best : null, matched };
}

function isGreeting(text: string): boolean {
  const t = text.toLowerCase().trim();
  return /^(hi|hello|hey|namaste|salam|good morning|good evening|good afternoon)\b/.test(t)
    || /\b(thank you|thanks|thank u|thx)\b/.test(t)
    || /\b(help|what can you do|who are you|what are you)\b/.test(t);
}

function buildLocalReply(userText: string, history: ChatTurn[], language = "English"): {
  content: string;
  intent: string | null;
  urgency: "low" | "medium" | "high" | null;
} {
  const { entry } = classify(userText);
  const hinglish = language === "Hinglish";

  // If the user already answered a follow-up, detect by looking at recent context
  const recentUser = history.filter((m) => m.role === "user").slice(-3).map((m) => m.content.toLowerCase());

  if (isGreeting(userText) && !entry) {
    return {
      content: hinglish
        ? "Namaste, main MediBot hoon — aapka AI health assistant. Apne symptoms apni language mein bataiye, jaise 'mujhe headache aur fever hai'. Main possible reasons, safe home care, precautions aur doctor ko kab dikhana hai, ismein guide karunga. Aaj main aapki kaise help kar sakta hoon?"
        : "Hi, I'm MediBot — your AI health assistant. Tell me what symptoms you're feeling (for example: 'I have a headache and fever') and I'll walk you through possible causes, home care, precautions, and when to see a doctor. How can I help you today?",

      intent: "greeting",
      urgency: null,
    };
  }

  if (!entry) {
    return {
      content: hinglish
        ? "Main aapki help kar sakta hoon — fever, headache, cough/cold, stomach, allergy, dizziness, back ya joint pain, urinary symptoms, period problems, eye issues aur kai common health concerns par. Aap bataiye kya feel ho raha hai, body mein kahan hai, aur kitne time se hai? Agar symptom list mein nahi hai tab bhi detail share kijiye — main safe next steps aur red flags bataunga."
        : "I can help with many common concerns, including fever, headache, cough and cold, stomach issues, allergies, dizziness, back or joint pain, urinary symptoms, period concerns, eye symptoms, and more. Please describe what you feel, where it is, and how long it has been happening. Even if your symptom is not on a shortcut, share the details and I will guide you through safe next steps and warning signs.",

      intent: null,
      urgency: null,
    };
  }

  // Determine if we've already asked follow-ups for this intent in this session
  const assistantMsgs = history.filter((m) => m.role === "assistant").map((m) => m.content);
  const alreadyAskedFollowUp = assistantMsgs.some(
    (m) => m.includes(entry.followUps[0])
  );
  const turnCount = recentUser.length;

  let content: string;

  if (!alreadyAskedFollowUp && turnCount <= 1) {
    // First message on this symptom → ask a follow-up + give initial care
    content = hinglish
      ? `Aapne jo bataya uske basis par yeh **${entry.label.toLowerCase()}** se related ho sakta hai, lekin yeh diagnosis nahi hai. Better guidance ke liye ek quick question:\n\n_${entry.followUps[0]}_\n\nTab tak safe home care:\n` +
        entry.remedies.slice(0, 2).map((r) => `• ${r}`).join("\n") +
        `\n\nAapka answer milne par main precautions aur doctor ko kab dikhana hai, woh bhi bataunga.`
      : `Thanks for sharing that. Based on what you've described, this may be related to **${entry.label.toLowerCase()}**, but this is not a diagnosis. To give you more relevant guidance, a quick question:\n\n` +
        `_${entry.followUps[0]}_\n\n` +
        `While you think about that, here's some general, safe self-care that usually helps:\n` +
        entry.remedies.slice(0, 2).map((r) => `• ${r}`).join("\n") +
        `\n\nI'll give you more detailed advice — including precautions and when to seek medical care — once I know a little more.`;
  } else {
    // Follow-up answered → provide full structured guidance
    content = hinglish
      ? `Aapke **${entry.label.toLowerCase()}** symptoms ke liye safe guidance:\n\n**Ghar par safe care**\n` +
        entry.remedies.map((r) => `• ${r}`).join("\n") +
        `\n\n**Savdhani**\n` + entry.precautions.map((r) => `• ${r}`).join("\n") +
        `\n\n**Recovery**\n` + entry.recovery.map((r) => `• ${r}`).join("\n") +
        `\n\n**Common medicines ke baare mein**\n${entry.otcInfo}\n\n` +
        `**In signs par doctor ko jaldi dikhaiye:**\n` + entry.redFlags.map((r) => `• ${r}`).join("\n") +
        `\n\n_Yeh educational information hai, definite diagnosis nahi. Symptoms severe ya worsening hon to qualified doctor se milna zaroori hai._`
      : `Here's a fuller picture for **${entry.label.toLowerCase()}** based on what you've shared:\n\n` +
        `**Home remedies that can help**\n` +
        entry.remedies.map((r) => `• ${r}`).join("\n") +
        `\n\n**Precautions**\n` +
        entry.precautions.map((r) => `• ${r}`).join("\n") +
        `\n\n**Recovery outlook**\n` +
        entry.recovery.map((r) => `• ${r}`).join("\n") +
        `\n\n**About common medicines**\n${entry.otcInfo}\n\n` +
        `**See a doctor promptly if you notice any of these red flags:**\n` +
        entry.redFlags.map((r) => `• ${r}`).join("\n") +
        `\n\n_This is general educational information and not a medical diagnosis or a substitute for professional care. For a definite diagnosis or persistent/worsening symptoms, please consult a qualified healthcare provider._`;
  }

  return { content, intent: entry.intent, urgency: entry.urgency };
}

async function callLLM(messages: ChatTurn[], language = "English"): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;
  const baseUrl = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

  const systemPrompt: ChatTurn = {
    role: "system",
    content:
      `You are MediBot, a friendly, safety-first AI health assistant. Never claim a definite diagnosis or recommend unsafe medication. Cover any health concern the user asks about, not only a fixed list. Ask focused follow-up questions, provide evidence-based self-care, precautions, recovery guidance, and clear red flags. If symptoms could be an emergency, urge local emergency services immediately. Keep responses concise and structured. Reply in ${language === "Hinglish" ? "natural Hinglish using simple Hindi-English wording" : language}, and end with a reminder that this is educational information, not a substitute for professional care.`, 
  };

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [systemPrompt, ...messages.slice(-10)],
        temperature: 0.4,
        max_tokens: 700,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content;
    return typeof txt === "string" && txt.length > 0 ? txt : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
    const userText = lastUser?.content || "";

    // Try external LLM first; fall back to local engine
    const language = typeof body.language === "string" ? body.language : "English";
    const llmReply = await callLLM(body.messages, language);
    let content: string;
    let intent: string | null;
    let urgency: "low" | "medium" | "high" | null;

    if (llmReply) {
      const cls = classify(userText);
      content = llmReply;
      intent = cls.entry?.intent || null;
      urgency = cls.entry?.urgency || null;
    } else {
      const local = buildLocalReply(userText, body.messages, language);
      content = local.content;
      intent = local.intent;
      urgency = local.urgency;
    }

    // Persist to Supabase when the client includes browser session metadata.
    // Keeping it in the JSON body avoids a browser preflight for custom headers.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const sessionRef = typeof body.sessionRef === "string" ? body.sessionRef : null;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
    const sessionTitle = typeof body.sessionTitle === "string" ? body.sessionTitle : null;

    if (supabaseUrl && serviceKey && sessionRef && sessionId) {
      const supabase = createClient(supabaseUrl, serviceKey);
      // upsert session
      await supabase.from("chat_sessions").upsert({
        id: sessionId,
        session_ref: sessionRef,
        title: sessionTitle || userText.slice(0, 60) || "New conversation",
      }, { onConflict: "id" });
      // store user + assistant messages
      await supabase.from("chat_messages").insert([
        { session_id: sessionId, session_ref: sessionRef, role: "user", content: userText },
        { session_id: sessionId, session_ref: sessionRef, role: "assistant", content, intent, urgency },
      ]);
    }

    return new Response(
      JSON.stringify({ reply: content, intent, urgency, engine: llmReply ? "llm" : "local" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Something went wrong processing your request." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
