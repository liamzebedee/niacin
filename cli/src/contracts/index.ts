
// System contracts used by the deployment pipeline.
import AddressResolverArtifact from './artifacts/AddressResolver.json'
import ProxyArtifact from './artifacts/Proxy.json'

const proxy_Artifact = ProxyArtifact
const addressResolver_Artifact = AddressResolverArtifact

export {
    proxy_Artifact,
    addressResolver_Artifact,
}

export const systemContracts = [
    'src/Proxy.sol',
    'src/AddressResolver.sol',
]
