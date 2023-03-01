// 
// The deployment manager centralises deployment information, and writes each event to disk as it happens.
// 
import { Deployment, Manifest, VersionControlInfo } from "../types"
import { inspect } from 'util'
const fs = require('node:fs')

export class DeploymentManager {
    deployment: Deployment

    constructor(public manifestPath: string, public manifest: Manifest, private revision: VersionControlInfo, private deployer: string, private rpcUrl: string, private chainId: string) {
        this.deployment = {
            id: manifest.deployments.length ? manifest.deployments[manifest.deployments.length - 1].id + 1 : 1,
            events: [],
            time: +new Date,
            rpcUrl,
            chainId,
            revision,
            deployer,
            _complete: false,
        }
        this.manifestPath = manifestPath
        // clone manifest. TODO code smell
        this.manifest = JSON.parse(JSON.stringify(manifest))
    }

    addEvent(event: any) {
        this.deployment.events.push(event)
        this.save()
    }

    complete() {
        this.deployment._complete = true
        this.save()
    }

    save() {
        try {
            // At each step, we write the new deployment events to disk.
            const manifest = {
                ...this.manifest,
                deployments: [
                    ...this.manifest.deployments,
                    this.deployment
                ]
            }

            fs.writeFileSync(
                this.manifestPath,
                JSON.stringify(manifest, null, 2)
            )
        } catch (err) {
            console.error("Error writing manifest")
            console.log(inspect(this.manifest, false, 10))
            console.error(err)
        }
    }
}
