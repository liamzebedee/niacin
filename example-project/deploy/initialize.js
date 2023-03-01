module.exports = async function(aller) {
    const { TakeMarket } = aller.contracts

    await aller.initialize({
        contract: TakeMarket,
        args: [1111]
    })

    const markets = ['1', '2', '3']
    for (const market of markets) {
        // Create a market.
        await aller.runStep({
            contract: TakeMarket,
            read: 'getTakeSharesContract',
            readArgs: [market],
            stale: value => value == '0x0000000000000000000000000000000000000000',
            write: 'getOrCreateTakeSharesContract',
            writeArgs: [market],
        })
    }
}