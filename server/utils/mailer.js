import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "ankitbasu10@gmail.com",
    pass: "fatj wnhf nhzf ursc",
  },
});

// Rate limiter: max 1 email per user per 60 seconds
const recentlySent = new Map();
const canSend = (email) => {
  const lastSent = recentlySent.get(email);
  if (lastSent && Date.now() - lastSent < 60000) return false;
  recentlySent.set(email, Date.now());
  return true;
};

// Pixel-themed welcome email for new signups
export const sendWelcomeEmail = async (toEmail, userName) => {
  if (!canSend(toEmail)) return;
  try {
    await transporter.sendMail({
      from: '"Pixel-Nexus" <ankitbasu10@gmail.com>',
      to: toEmail,
      subject: "🎮 Welcome to Pixel-Nexus, Adventurer!",
      html: `
        <div style="background:#0a0a1a;padding:0;font-family:'Courier New',monospace;max-width:600px;margin:0 auto;border:4px solid #fbbf24;">
          <!-- Pixel header bar -->
          <div style="background:#111;border-bottom:4px solid #333;padding:20px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center">
                <span style="font-size:32px;">🎨</span>
                <h1 style="color:#fbbf24;font-size:22px;margin:8px 0 0;letter-spacing:4px;text-transform:uppercase;font-family:'Courier New',monospace;">PIXEL-NEXUS</h1>
                <p style="color:#00cec9;font-size:10px;letter-spacing:6px;margin:4px 0 0;">REAL-TIME COLLAB WHITEBOARD</p>
              </td>
            </tr></table>
          </div>

          <!-- HP Bar style welcome -->
          <div style="padding:24px;">
            <div style="background:#1a1a2e;border:3px solid #00cec9;padding:20px;margin-bottom:16px;">
              <h2 style="color:#00cec9;margin:0 0 4px;font-family:'Courier New',monospace;font-size:16px;letter-spacing:2px;">▸ NEW PLAYER JOINED!</h2>
              <p style="color:#fbbf24;font-size:20px;margin:8px 0;font-family:'Courier New',monospace;">Welcome, ${userName}!</p>
              <div style="background:#333;height:12px;border:2px solid #555;margin:12px 0;">
                <div style="background:linear-gradient(90deg,#00cec9,#a29bfe);height:100%;width:100%;"></div>
              </div>
              <p style="color:#888;font-size:10px;letter-spacing:1px;margin:0;">HP ████████████████████ FULL</p>
            </div>

            <!-- Quest items -->
            <div style="background:#1a1a2e;border:3px solid #444;padding:16px;margin-bottom:16px;">
              <h3 style="color:#fbbf24;font-size:12px;letter-spacing:3px;margin:0 0 12px;font-family:'Courier New',monospace;">📜 YOUR QUEST LOG</h3>

              <table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Courier New',monospace;">
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #333;">
                    <span style="color:#00cec9;font-size:16px;">🎨</span>
                    <span style="color:#fff;font-size:12px;margin-left:8px;letter-spacing:1px;">COLLAB REALM</span>
                    <p style="color:#888;font-size:10px;margin:4px 0 0 28px;">Create & join real-time whiteboard rooms</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #333;">
                    <span style="color:#fbbf24;font-size:16px;">🤖</span>
                    <span style="color:#fff;font-size:12px;margin-left:8px;letter-spacing:1px;">AI SOLVE</span>
                    <p style="color:#888;font-size:10px;margin:4px 0 0 28px;">Draw equations → get instant answers</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #333;">
                    <span style="color:#a29bfe;font-size:16px;">🕹️</span>
                    <span style="color:#fff;font-size:12px;margin-left:8px;letter-spacing:1px;">THE ARCADE</span>
                    <p style="color:#888;font-size:10px;margin:4px 0 0 28px;">Snake • Pong • Memory • Minesweeper • TTT</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px;">
                    <span style="color:#ff6b6b;font-size:16px;">💬</span>
                    <span style="color:#fff;font-size:12px;margin-left:8px;letter-spacing:1px;">PARTY CHAT</span>
                    <p style="color:#888;font-size:10px;margin:4px 0 0 28px;">Real-time messaging with your team</p>
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin:20px 0;">
              <a href="http://localhost:5173/dashboard" style="background:#00cec9;color:#000;padding:14px 40px;text-decoration:none;font-weight:bold;font-size:12px;font-family:'Courier New',monospace;letter-spacing:3px;display:inline-block;border:3px solid #fff;box-shadow:4px 4px 0 #000;">
                ▸ ENTER THE NEXUS
              </a>
            </div>

            <!-- Coin reward -->
            <div style="background:#1a1a2e;border:3px solid #fbbf24;padding:12px;text-align:center;">
              <p style="color:#fbbf24;font-size:12px;margin:0;font-family:'Courier New',monospace;letter-spacing:2px;">
                🪙 +100 PIXEL COINS AWARDED 🪙
              </p>
              <p style="color:#888;font-size:10px;margin:4px 0 0;">Sign-up bonus added to your account!</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#111;border-top:4px solid #333;padding:16px;text-align:center;">
            <p style="color:#555;font-size:9px;font-family:'Courier New',monospace;letter-spacing:2px;margin:0;">
              © 2025 PIXEL-NEXUS • BUILT WITH ❤️ FOR CREATIVE COLLABORATION
            </p>
            <p style="color:#333;font-size:8px;margin:4px 0 0;">████████████████████████████████</p>
          </div>
        </div>
      `,
    });
    console.log(`Welcome email sent to ${toEmail}`);
  } catch (error) {
    console.error("Failed to send welcome email:", error.message);
  }
};

// Pixel-themed login notification email
export const sendLoginEmail = async (toEmail, userName) => {
  if (!canSend(toEmail)) return;
  try {
    const now = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    await transporter.sendMail({
      from: '"Pixel-Nexus" <ankitbasu10@gmail.com>',
      to: toEmail,
      subject: "🔑 New Login Detected — Pixel-Nexus",
      html: `
        <div style="background:#0a0a1a;padding:0;font-family:'Courier New',monospace;max-width:600px;margin:0 auto;border:4px solid #00cec9;">
          <!-- Header -->
          <div style="background:#111;border-bottom:4px solid #333;padding:20px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center">
                <span style="font-size:32px;">🔑</span>
                <h1 style="color:#fbbf24;font-size:22px;margin:8px 0 0;letter-spacing:4px;font-family:'Courier New',monospace;">PIXEL-NEXUS</h1>
                <p style="color:#888;font-size:10px;letter-spacing:4px;margin:4px 0 0;">LOGIN ALERT</p>
              </td>
            </tr></table>
          </div>

          <div style="padding:24px;">
            <!-- Alert box -->
            <div style="background:#1a1a2e;border:3px solid #00cec9;padding:20px;margin-bottom:16px;">
              <h2 style="color:#00cec9;margin:0 0 8px;font-family:'Courier New',monospace;font-size:14px;letter-spacing:2px;">▸ SESSION STARTED</h2>
              <p style="color:#fff;font-size:16px;margin:4px 0;font-family:'Courier New',monospace;">Welcome back, ${userName}!</p>
            </div>

            <!-- Login details -->
            <div style="background:#1a1a2e;border:3px solid #444;padding:16px;margin-bottom:16px;">
              <h3 style="color:#fbbf24;font-size:11px;letter-spacing:3px;margin:0 0 12px;font-family:'Courier New',monospace;">📋 SESSION LOG</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Courier New',monospace;">
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #333;">
                    <span style="color:#888;font-size:11px;">TIME</span>
                  </td>
                  <td style="padding:6px 0;border-bottom:1px solid #333;text-align:right;">
                    <span style="color:#fff;font-size:11px;">${now}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #333;">
                    <span style="color:#888;font-size:11px;">ACCOUNT</span>
                  </td>
                  <td style="padding:6px 0;border-bottom:1px solid #333;text-align:right;">
                    <span style="color:#00cec9;font-size:11px;">${toEmail}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#888;font-size:11px;">STATUS</span>
                  </td>
                  <td style="padding:6px 0;text-align:right;">
                    <span style="color:#00b894;font-size:11px;">● ACTIVE</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Warning -->
            <div style="background:rgba(255,107,107,0.1);border:2px solid #ff6b6b;padding:12px;text-align:center;">
              <p style="color:#ff6b6b;font-size:10px;margin:0;font-family:'Courier New',monospace;letter-spacing:1px;">
                ⚠ IF THIS WASN'T YOU, CHANGE YOUR PASSWORD IMMEDIATELY
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#111;border-top:4px solid #333;padding:16px;text-align:center;">
            <p style="color:#555;font-size:9px;font-family:'Courier New',monospace;letter-spacing:2px;margin:0;">
              © 2025 PIXEL-NEXUS • BUILT WITH ❤️ FOR CREATIVE COLLABORATION
            </p>
            <p style="color:#333;font-size:8px;margin:4px 0 0;">████████████████████████████████</p>
          </div>
        </div>
      `,
    });
    console.log(`Login email sent to ${toEmail}`);
  } catch (error) {
    console.error("Failed to send login email:", error.message);
  }
};
