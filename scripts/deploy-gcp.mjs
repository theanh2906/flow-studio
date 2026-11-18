import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'ben-na-wedding';
const SERVICE_NAME = process.env.GCP_SERVICE_NAME || 'bennaproduction';
const REGION = process.env.GCP_REGION || 'asia-southeast1';
const SOURCE_BUCKET = `gs://run-sources-${PROJECT_ID}-${REGION}/services/${SERVICE_NAME}`;

// 1. Ensure Google Cloud SDK bin directory is in PATH on Windows
if (process.platform === 'win32') {
  const sdkPaths = [
    'C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\bin',
    'C:\\Program Files\\Google\\Cloud SDK\\google-cloud-sdk\\bin',
    path.join(
      process.env.LOCALAPPDATA || '',
      'Google\\Cloud SDK\\google-cloud-sdk\\bin'
    ),
  ];
  for (const p of sdkPaths) {
    if (fs.existsSync(p) && !(process.env.PATH || '').includes(p)) {
      process.env.PATH = `${p};${process.env.PATH || ''}`;
    }
  }
}

const gcloudBin = process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud';

function runCmd(command, args, options = {}) {
  const res = spawnSync(command, args, {
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  });
  if (res.status !== 0) {
    const errText = `${res.stderr || ''}\n${res.stdout || ''}`;
    if (options.capture && res.stderr && !options.silentError) {
      console.error(res.stderr);
    }
    const err = new Error(
      `Command failed: ${command} ${args.join(' ')} (exit code ${res.status})`
    );
    err.stderr = errText;
    throw err;
  }
  return res.stdout;
}

// 2. Read GEMINI_API_KEY from local .env / .env.local if available
function readLocalGeminiApiKey() {
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^GEMINI_API_KEY\s*=\s*(.+)$/);
      if (match) {
        const val = match[1].trim().replace(/^["']|["']$/g, '');
        if (val && val !== 'MY_GEMINI_API_KEY') {
          return val;
        }
      }
    }
  }
  return null;
}

console.log('==========================================================');
console.log('🚀 Deploying FlowStudio Pro to Google Cloud Run (GCC)');
console.log(`   • Project : ${PROJECT_ID}`);
console.log(`   • Service : ${SERVICE_NAME}`);
console.log(`   • Region  : ${REGION}`);
console.log('==========================================================\n');

// Pre-flight check: Verify GCP project is active and not suspended
let existingServiceSpec = null;
try {
  const rawJson = runCmd(
    gcloudBin,
    [
      'run',
      'services',
      'describe',
      SERVICE_NAME,
      `--project=${PROJECT_ID}`,
      `--region=${REGION}`,
      '--format=json',
    ],
    { capture: true, silentError: true }
  );
  existingServiceSpec = JSON.parse(rawJson);
} catch (err) {
  const msg = String(err.stderr || err.message || '');
  if (
    msg.includes('CONSUMER_SUSPENDED') ||
    msg.includes('has been suspended') ||
    msg.includes('account problem for the requested project')
  ) {
    console.error('==========================================================');
    console.error(
      `❌ LỖI TÀI KHOẢN GCP: Project "${PROJECT_ID}" đang bị Google Cloud tạm khóa (CONSUMER_SUSPENDED)!`
    );
    console.error(
      '   • Nguyên nhân: Google Cloud đã tạm ngưng project này (kiểm tra email hoặc Google Cloud Console để kháng nghị/mở khóa).'
    );
    console.error(
      '   • Giải pháp nhanh: Đổi sang GCP Project khác đang hoạt động bằng biến môi trường GCP_PROJECT_ID (VD: ben-na-wedding).'
    );
    console.error('==========================================================');
    process.exit(1);
  }
  // If service simply doesn't exist yet or API not enabled yet, we'll deploy a new Cloud Run service using Dockerfile!
  existingServiceSpec = null;
}

const localApiKey = readLocalGeminiApiKey();

const isAiStudioSourceService = Boolean(
  existingServiceSpec?.spec?.template?.metadata?.annotations?.[
    'run.googleapis.com/sources'
  ]
);

if (isAiStudioSourceService) {
  // Fast Mode: Direct Standalone Tarball Upload for existing AI Studio Cloud Run service
  console.log('📦 [1/4] Building Next.js standalone production bundle...');
  runCmd('npx', ['next', 'build']);

  const standaloneDir = path.join(process.cwd(), '.next', 'standalone');
  if (!fs.existsSync(standaloneDir)) {
    throw new Error(
      'Không tìm thấy .next/standalone. Hãy kiểm tra output: "standalone" trong next.config.ts.'
    );
  }

  const staticSrc = path.join(process.cwd(), '.next', 'static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  if (fs.existsSync(staticSrc)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
  }

  const publicSrc = path.join(process.cwd(), 'public');
  const publicDest = path.join(standaloneDir, 'public');
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
  }

  for (const winPkgDir of [
    path.join(standaloneDir, 'node_modules', '@img'),
    path.join(standaloneDir, 'node_modules', '@next'),
  ]) {
    if (fs.existsSync(winPkgDir)) {
      for (const entry of fs.readdirSync(winPkgDir)) {
        if (entry.includes('win32')) {
          fs.rmSync(path.join(winPkgDir, entry), {
            recursive: true,
            force: true,
          });
        }
      }
    }
  }

  console.log('\n🗜️  [2/4] Packaging standalone bundle (.tar.gz)...');
  const timestampId = `${(Date.now() / 1000).toFixed(3)}-flowstudio`;
  const tarFileName = `${timestampId}.tar.gz`;
  const tempTarPath = path.join(os.tmpdir(), tarFileName);

  runCmd('tar', [
    '-czf',
    tempTarPath,
    '-C',
    standaloneDir,
    '.next',
    'node_modules',
    'public',
    'package.json',
    'server.js',
  ]);

  const gcsTargetUri = `${SOURCE_BUCKET}/${tarFileName}`;
  console.log(`\n☁️  [3/4] Uploading bundle to ${gcsTargetUri}...`);
  runCmd(gcloudBin, ['storage', 'cp', tempTarPath, gcsTargetUri, '--quiet']);

  console.log('\n🔄 [4/4] Updating Cloud Run service revision...');
  const serviceSpec = structuredClone(existingServiceSpec);
  delete serviceSpec.status;
  if (serviceSpec.metadata) {
    delete serviceSpec.metadata.ManagedFields;
    delete serviceSpec.metadata.generation;
    delete serviceSpec.metadata.resourceVersion;
    delete serviceSpec.metadata.selfLink;
    delete serviceSpec.metadata.uid;
    delete serviceSpec.metadata.creationTimestamp;
  }

  if (serviceSpec.spec?.template?.metadata) {
    delete serviceSpec.spec.template.metadata.name;
    serviceSpec.spec.template.metadata.annotations[
      'run.googleapis.com/sources'
    ] = JSON.stringify({
      'app-container': gcsTargetUri,
    });
    serviceSpec.spec.template.metadata.annotations[
      'generativelanguage.googleapis.com/nonce'
    ] = `local-deploy-${Date.now()}`;
  }

  if (
    localApiKey &&
    Array.isArray(serviceSpec.spec?.template?.spec?.containers)
  ) {
    const container = serviceSpec.spec.template.spec.containers[0];
    container.env = Array.isArray(container.env) ? container.env : [];
    const existingEnv = container.env.find((e) => e.name === 'GEMINI_API_KEY');
    if (existingEnv) {
      existingEnv.value = localApiKey;
    } else {
      container.env.push({ name: 'GEMINI_API_KEY', value: localApiKey });
    }
  }

  const tempServiceJsonPath = path.join(
    os.tmpdir(),
    `cloudrun-${SERVICE_NAME}-${Date.now()}.json`
  );
  fs.writeFileSync(
    tempServiceJsonPath,
    JSON.stringify(serviceSpec, null, 2),
    'utf8'
  );

  try {
    runCmd(gcloudBin, [
      'run',
      'services',
      'replace',
      tempServiceJsonPath,
      `--project=${PROJECT_ID}`,
      `--region=${REGION}`,
      '--quiet',
    ]);
  } finally {
    fs.rmSync(tempTarPath, { force: true });
    fs.rmSync(tempServiceJsonPath, { force: true });
  }
} else {
  // Standard Cloud Run Dockerfile Deploy Mode (for deploying to any clean/active GCP project)
  if (!existingServiceSpec) {
    console.log(
      `🔧 [1/3] Enabling Cloud Run & Cloud Build APIs on project "${PROJECT_ID}"...`
    );
    runCmd(gcloudBin, [
      'services',
      'enable',
      'run.googleapis.com',
      'cloudbuild.googleapis.com',
      'artifactregistry.googleapis.com',
      'storage.googleapis.com',
      `--project=${PROJECT_ID}`,
      '--quiet',
    ]);

    // Ensure Cloud Build default compute service account has builder role (required on GCP projects created after 2024)
    console.log(
      `🔐 [2/3] Ensuring Cloud Build IAM role for default compute service account...`
    );
    const projectNumber = runCmd(
      gcloudBin,
      [
        'projects',
        'describe',
        PROJECT_ID,
        '--format=value(projectNumber)',
      ],
      { capture: true }
    ).trim();
    if (projectNumber) {
      const computeSa = `serviceAccount:${projectNumber}-compute@developer.gserviceaccount.com`;
      runCmd(
        gcloudBin,
        [
          'projects',
          'add-iam-policy-binding',
          PROJECT_ID,
          `--member=${computeSa}`,
          '--role=roles/cloudbuild.builds.builder',
          '--condition=None',
          '--quiet',
        ],
        { capture: true }
      );
    }
  }

  console.log(
    `\n🚀 Building & Deploying container to Cloud Run (${SERVICE_NAME})...`
  );
  const deployArgs = [
    'run',
    'deploy',
    SERVICE_NAME,
    '--source',
    '.',
    `--project=${PROJECT_ID}`,
    `--region=${REGION}`,
    '--port=3000',
    '--memory=2Gi',
    '--timeout=300',
    '--allow-unauthenticated',
    '--quiet',
  ];
  if (localApiKey) {
    deployArgs.push(`--update-env-vars=GEMINI_API_KEY=${localApiKey}`);
  }
  runCmd(gcloudBin, deployArgs);
}

const finalUrl = runCmd(
  gcloudBin,
  [
    'run',
    'services',
    'describe',
    SERVICE_NAME,
    `--project=${PROJECT_ID}`,
    `--region=${REGION}`,
    '--format=value(status.url)',
  ],
  { capture: true }
).trim();

console.log('\n==========================================================');
console.log('✅ DEPLOY PRODUCTION HOÀN TẤT!');
console.log(`🔗 Cloud Run URL : ${finalUrl}`);
console.log('==========================================================');
