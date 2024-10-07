import {BaseFeeTestConfig, client, walletClient} from "./utils.js";

async function main() {
    const baseFee = await client.getGasPrice()
    console.log('baseFee: ', baseFee)
    const simulateResult = await client.simulateContract({
        ...BaseFeeTestConfig,
        functionName: 'testRevert',
        gasPrice: baseFee,
    })
    console.log('simulateResult: ', simulateResult)

    // const result = await walletClient.writeContract({
    //     ...BaseFeeTestConfig,
    //     functionName: 'testRevert',
    //     gas: 20000000,
    //     gasPrice: 5000000000
    // })
    // console.log('result: ', result)
}
main().catch(console.error);
