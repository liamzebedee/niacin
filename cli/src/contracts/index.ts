// 
// System contracts used by the deployment pipeline.
// 
import AddressProviderArtifact from './artifacts/AddressProvider.json'
import ProxyArtifact from './artifacts/Proxy.json'

import MixinInitializableArtifact from './artifacts/MixinInitializable.json'
import MixinResolverArtifact from './artifacts/MixinResolver.json'

const proxy_Artifact = ProxyArtifact
const addressProvider_Artifact = AddressProviderArtifact

// import DSProxyFactoryArtifact from './artifacts/DSProxyFactory.json'
// import DSProxyArtifact from './artifacts/DSProxy.json'
// const dsProxyFactory_Artifact = DSProxyFactoryArtifact
// const dsProxy_Artifact = DSProxyArtifact

export {
    proxy_Artifact,
    addressProvider_Artifact,
    MixinResolverArtifact,
    MixinInitializableArtifact,
    // dsProxyFactory_Artifact,
    // dsProxy_Artifact
}

