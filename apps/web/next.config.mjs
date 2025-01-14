import { getGitVersion, getCommitHash } from './scripts/gitInfo.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { printer } from './scripts/printer.mjs';
import debugLocal from 'next-debug-local';

const dependencies = JSON.parse(fs.readFileSync('./package.json', 'utf8'))[
  'dependencies'
];

const enableDebugLocal = path.isAbsolute(process.env.LOCAL_BLOCK_SUITE ?? '');
const EDITOR_VERSION = enableDebugLocal
  ? 'local-version'
  : dependencies['@blocksuite/editor'];

const profileTarget = {
  ac: '100.85.73.88:12001',
  dev: '100.84.105.99:11001',
  test: '100.84.105.99:11001',
  stage: '',
  pro: 'http://pathfinder.affine.pro',
  local: '127.0.0.1:3000',
};

const getRedirectConfig = profile => {
  const target = profileTarget[profile || 'dev'] || profileTarget['dev'];

  return [
    [
      { source: '/api/:path*', destination: `http://${target}/api/:path*` },
      {
        source: '/collaboration/:path*',
        destination: `http://${target}/collaboration/:path*`,
      },
    ],
    target,
    profile || 'dev',
  ];
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  swcMinify: false,
  publicRuntimeConfig: {
    NODE_ENV: process.env.NODE_ENV,
    PROJECT_NAME: process.env.npm_package_name,
    BUILD_DATE: new Date().toISOString(),
    CI: process.env.CI || null,
    VERSION: getGitVersion(),
    COMMIT_HASH: getCommitHash(),
    EDITOR_VERSION,
  },
  transpilePackages: [
    '@affine/component',
    '@affine/i18n',
    '@affine/datacenter',
    '@toeverything/pathfinder-logger',
  ],
  webpack: config => {
    config.experiments = { ...config.experiments, topLevelAwait: true };
    config.module.rules.push({
      test: /\.md$/i,
      loader: 'raw-loader',
    });

    return config;
  },
  images: {
    unoptimized: true,
  },
  rewrites: async () => {
    const [profile, target, desc] = getRedirectConfig(
      process.env.NODE_API_SERVER
    );
    printer.info(`API request proxy to [${desc} Server]: ` + target);
    return profile;
  },
  basePath: process.env.NEXT_BASE_PATH,
  experimental: {
    forceSwcTransforms: true,
  },
};

const baseDir = process.env.LOCAL_BLOCK_SUITE ?? '/';
const withDebugLocal = debugLocal(
  {
    '@blocksuite/editor': path.resolve(baseDir, 'packages', 'editor'),
    '@blocksuite/blocks/models': path.resolve(
      baseDir,
      'packages',
      'blocks',
      'src',
      'models'
    ),
    '@blocksuite/blocks/std': path.resolve(
      baseDir,
      'packages',
      'blocks',
      'src',
      'std'
    ),
    '@blocksuite/blocks': path.resolve(baseDir, 'packages', 'blocks'),
    '@blocksuite/store': path.resolve(baseDir, 'packages', 'store'),
  },
  {
    enable: enableDebugLocal,
  }
);

const detectFirebaseConfig = () => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    printer.warn('NEXT_PUBLIC_FIREBASE_API_KEY not found, please check it');
  } else {
    printer.info('NEXT_PUBLIC_FIREBASE_API_KEY found');
  }
};
detectFirebaseConfig();

export default withDebugLocal(nextConfig);
