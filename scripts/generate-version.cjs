const { execSync } = require('child_process')
const fs = require('fs')

try {
  const tag = execSync(
    'git describe --tags --abbrev=0'
  )
    .toString()
    .trim()

  const commitsSinceTag = execSync(
    `git rev-list ${tag}..HEAD --count`
  )
    .toString()
    .trim()

  const commitHash = execSync(
    'git rev-parse --short HEAD'
  )
    .toString()
    .trim()

  const version = `${tag}-${commitsSinceTag}-${commitHash}`

  let env = ''

  if (fs.existsSync('.env')) {
    env = fs.readFileSync('.env', 'utf8')
  }

  const versionLine = `VITE_APP_VERSION=${version}`

  if (/^VITE_APP_VERSION=.*$/m.test(env)) {
    env = env.replace(
      /^VITE_APP_VERSION=.*$/m,
      versionLine
    )
  } else {
    env += `${env.endsWith('\n') || env === '' ? '' : '\n'}${versionLine}\n`
  }

  fs.writeFileSync('.env', env)

  console.log(`Version written: ${version}`)
} catch (err) {
  console.error(
    'Could not generate version from git:',
    err.message
  )

  process.exit(1)
}