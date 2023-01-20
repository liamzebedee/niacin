import { APP_BASE_URL, OCTOKIT_TOKEN } from "../../../config"


const octokit = new Octokit({
    auth: OCTOKIT_TOKEN
})

await octokit.request('POST /repos/{owner}/{repo}/hooks', {
    owner: 'OWNER',
    repo: 'REPO',
    name: 'web',
    active: true,
    events: [
        'push'
    ],
    config: {
        url: `${APP_BASE_URL}/api/webhooks/github/push`,
        content_type: 'json',
        insecure_ssl: '0'
    }
})