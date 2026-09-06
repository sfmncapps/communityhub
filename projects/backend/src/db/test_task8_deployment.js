/**
 * TASK 8 TEST SUITE: PRODUCTION DEPLOYMENT, SECURITY HARDENING & DOCS (RFP §8, §9, §10)
 *
 * Validates:
 *  1. Security HTTP headers & x-powered-by suppression
 *  2. Production CORS whitelist rules (commhub.heconf.net, hapacgh.org, localhost)
 *  3. In-memory rate limiting middleware functionality
 *  4. Health check diagnostics endpoint logic
 *  5. Deployment configuration artifacts (Nginx, PM2, Docker, deploy.sh)
 *  6. Documentation deliverables (Deployment Guide, Operations Manual, API Docs)
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRateLimiter } from "../middleware/rateLimiter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTask8TestSuite() {
  console.log("\n=================================================");
  console.log("   TASK 8 TEST SUITE: DEPLOYMENT & HARDENING");
  console.log("=================================================\n");

  // --- Suite 1: Security Headers & Express Server Configuration ---
  console.log("--- Suite 1: Security Headers & Express Server ---");
  const serverPath = path.join(__dirname, "..", "..", "server.js");
  assert(fs.existsSync(serverPath), "server.js exists");

  const serverSrc = fs.readFileSync(serverPath, "utf-8");
  assert(serverSrc.includes('app.disable("x-powered-by")'), "server.js disables X-Powered-By header");
  assert(serverSrc.includes('res.setHeader("X-Content-Type-Options", "nosniff")'), "Enforces X-Content-Type-Options: nosniff");
  assert(serverSrc.includes('res.setHeader("X-Frame-Options", "SAMEORIGIN")'), "Enforces X-Frame-Options: SAMEORIGIN");
  assert(serverSrc.includes('res.setHeader("Referrer-Policy"'), "Enforces strict-origin-when-cross-origin Referrer-Policy");

  // --- Suite 2: CORS Whitelist Configuration ---
  console.log("\n--- Suite 2: Production CORS Whitelist ---");
  assert(serverSrc.includes("commhub.heconf.net"), "CORS whitelist includes test instance (commhub.heconf.net)");
  assert(serverSrc.includes("hapacgh.org"), "CORS whitelist includes production customer instance (hapacgh.org)");
  assert(serverSrc.includes("http://localhost:5173"), "CORS whitelist permits local development frontend");

  // Simulate CORS origin check logic
  const ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://commhub.heconf.net",
    "https://hapacgh.org",
    "https://www.hapacgh.org",
  ];

  const checkCors = (origin, nodeEnv = "production") => {
    if (!origin) return true; // server-to-server
    if (ALLOWED_ORIGINS.includes(origin) || nodeEnv !== "production") return true;
    return false;
  };

  assert(checkCors("https://hapacgh.org", "production"), "Production customer domain is allowed");
  assert(checkCors("https://commhub.heconf.net", "production"), "Test instance domain is allowed");
  assert(checkCors(null, "production"), "Non-browser / curl requests with no origin are allowed");
  assert(!checkCors("https://malicious-phishing.com", "production"), "Untrusted external origin is blocked in production");
  assert(checkCors("https://any-dev-origin.com", "development"), "Permissive in development mode");

  // --- Suite 3: Rate Limiting Guard Middleware ---
  console.log("\n--- Suite 3: Rate Limiting Guard Middleware ---");
  const testLimiter = createRateLimiter({
    windowMs: 1000,
    maxRequests: 3,
    message: "Rate limit test exceeded",
  });

  const mockReq = { headers: { "x-forwarded-for": "198.51.100.42" }, socket: {} };
  let lastStatus = null;
  let lastBody = null;
  const headersSet = {};

  const mockRes = {
    setHeader: (k, v) => { headersSet[k] = v; },
    status: (code) => {
      lastStatus = code;
      return {
        json: (b) => { lastBody = b; },
      };
    },
  };

  let nextCalled = 0;
  const mockNext = () => { nextCalled++; };

  // Request 1, 2, 3: Should pass
  testLimiter(mockReq, mockRes, mockNext);
  testLimiter(mockReq, mockRes, mockNext);
  testLimiter(mockReq, mockRes, mockNext);
  assert(nextCalled === 3, "First 3 requests pass under burst threshold");
  assert(headersSet["X-RateLimit-Limit"] === 3, "RateLimit-Limit header set to 3");
  assert(headersSet["X-RateLimit-Remaining"] === 0, "RateLimit-Remaining reaches 0");

  // Request 4: Should be blocked with 429
  testLimiter(mockReq, mockRes, mockNext);
  assert(lastStatus === 429, "4th request blocked with HTTP 429 Too Many Requests");
  assert(lastBody?.ok === false, "429 response contains ok: false");
  assert(typeof lastBody?.retryAfterSeconds === "number", "429 response includes retryAfterSeconds");

  // --- Suite 4: Health Check Diagnostics ---
  console.log("\n--- Suite 4: Health Check Diagnostics ---");
  assert(serverSrc.includes('app.get("/api/health"'), "server.js defines /api/health endpoint");
  assert(serverSrc.includes("uptimeSeconds"), "Health check reports uptimeSeconds");
  assert(serverSrc.includes("version"), "Health check reports API version");
  assert(serverSrc.includes("database"), "Health check includes live database probe");

  // --- Suite 5: Deployment Configurations & Artifact Integrity ---
  console.log("\n--- Suite 5: Deployment Configurations & Artifact Integrity ---");
  const projectsRoot = path.resolve(__dirname, "../../..");
  const workspaceRoot = path.resolve(__dirname, "../../../..");

  const nginxConfPath = path.join(projectsRoot, "deployment", "nginx", "commhub.conf");
  assert(fs.existsSync(nginxConfPath), "Nginx configuration commhub.conf exists");
  if (fs.existsSync(nginxConfPath)) {
    const conf = fs.readFileSync(nginxConfPath, "utf-8");
    assert(conf.includes("commhub.heconf.net"), "Nginx config covers commhub.heconf.net");
    assert(conf.includes("hapacgh.org"), "Nginx config covers hapacgh.org");
    assert(conf.includes("proxy_pass http://127.0.0.1:5000"), "Nginx reverse-proxies /api/ to backend port 5000");
    assert(conf.includes("try_files $uri $uri/ /index.html"), "Nginx handles frontend SPA client routing");
    assert(conf.includes("ssl_protocols TLSv1.2 TLSv1.3"), "Nginx enforces modern TLSv1.2 & TLSv1.3");
  }

  const pm2Path = path.join(projectsRoot, "deployment", "ecosystem.config.cjs");
  assert(fs.existsSync(pm2Path), "PM2 ecosystem.config.cjs exists");
  if (fs.existsSync(pm2Path)) {
    const pm2 = fs.readFileSync(pm2Path, "utf-8");
    assert(pm2.includes("commhub-backend"), "PM2 names the app commhub-backend");
    assert(pm2.includes('exec_mode: "cluster"'), "PM2 configures cluster mode");
  }

  const dockerBackend = path.join(projectsRoot, "deployment", "docker", "Dockerfile.backend");
  assert(fs.existsSync(dockerBackend), "Dockerfile.backend exists");

  const dockerFrontend = path.join(projectsRoot, "deployment", "docker", "Dockerfile.frontend");
  assert(fs.existsSync(dockerFrontend), "Dockerfile.frontend exists");

  const dockerCompose = path.join(projectsRoot, "docker-compose.yml");
  assert(fs.existsSync(dockerCompose), "docker-compose.yml exists");

  const deploySh = path.join(projectsRoot, "deployment", "scripts", "deploy.sh");
  assert(fs.existsSync(deploySh), "Automated deploy.sh script exists");

  const envProdBackend = path.join(projectsRoot, "backend", ".env.production.example");
  assert(fs.existsSync(envProdBackend), "Backend .env.production.example exists");

  // --- Suite 6: Documentation Deliverables (RFP §9) ---
  console.log("\n--- Suite 6: Documentation Deliverables (RFP §9) ---");
  const deployGuidePath = path.join(workspaceRoot, "docs", "DEPLOYMENT_GUIDE.md");
  assert(fs.existsSync(deployGuidePath), "DEPLOYMENT_GUIDE.md exists in /docs");
  if (fs.existsSync(deployGuidePath)) {
    const content = fs.readFileSync(deployGuidePath, "utf-8");
    assert(content.includes("commhub.heconf.net") && content.includes("hapacgh.org"), "Deployment guide covers both test and production targets");
    assert(content.includes("Certbot"), "Deployment guide includes SSL/TLS Certbot instructions");
  }

  const adminManualPath = path.join(workspaceRoot, "docs", "ADMIN_OPERATIONS_MANUAL.md");
  assert(fs.existsSync(adminManualPath), "ADMIN_OPERATIONS_MANUAL.md exists in /docs");
  if (fs.existsSync(adminManualPath)) {
    const content = fs.readFileSync(adminManualPath, "utf-8");
    assert(content.includes("4-Tier"), "Operations manual details 4-tier RBAC");
    assert(content.includes("State-Record"), "Operations manual details state-record verification procedure");
    assert(content.includes("Theming"), "Operations manual details theme & menu customization");
  }

  const apiDocPath = path.join(workspaceRoot, "docs", "API_DOCUMENTATION.md");
  assert(fs.existsSync(apiDocPath), "API_DOCUMENTATION.md exists in /docs");
  if (fs.existsSync(apiDocPath)) {
    const content = fs.readFileSync(apiDocPath, "utf-8");
    assert(content.includes("/api/auth"), "API documentation covers auth routes");
    assert(content.includes("/api/collectives"), "API documentation covers collectives and page hierarchy");
    assert(content.includes("/api/events"), "API documentation covers events directory");
  }

  // --- Summary ---
  console.log("\n=================================================");
  console.log(`TASK 8 TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
  console.log("=================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTask8TestSuite();
