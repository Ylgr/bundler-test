import {
    AccountFactoryConfig,
    AccountFactoryContract,
    accountLocal,
    client, dummySignature,
    entryPoint, EntryPointConfig,
    EntryPointContract, TokenPaymasterConfig
} from "./utils.js";
import {toHex} from "viem";


async function main() {
    console.log('dasdsdas')
    // console.log('accountLocal.address: ', accountLocal.address)
    // const sender = await AccountFactoryContract.read.accountImplementation();
    // const sender = await AccountFactoryContract.read.getAddress(accountLocal.address, 0n);
    const sender = await client.readContract({
        ...AccountFactoryConfig,
        functionName: 'getAddress',
        args: [accountLocal.address, 0n],
    })
    console.log('sender: ', sender)
    const nonce = await client.readContract({
        ...EntryPointConfig,
        functionName: 'getNonce',
        args: [sender, 0n],
    })
    console.log('nonce: ', nonce)
    const initCode = '0x';
    const callData = '0x7bb3742800000000000000000000000038869bf66a61cf6bdb996a6ae40d5853fd43b52600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001048d80ff0a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000aa00eabcd21b75349c59a4177e10ed17fbf2955fe6970000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ad2ada4b2ab6b09ac980d47a314c54e9782f1d0c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
    const callGasLimit = toHex(1000000n);
    const verificationGasLimit = toHex(1000000n);
    const paymasterAndData = TokenPaymasterConfig.address;
    const signature = dummySignature;
    const sendOpRequest = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_sendUserOperation",
        "params": [
            // UserOperation object
            {
                sender,
                nonce: toHex(nonce),
                initCode,
                callData,
                callGasLimit,
                verificationGasLimit,
                // preVerificationGas,
                // maxFeePerGas,
                // maxPriorityFeePerGas,
                paymasterAndData,
                signature
            },
            // Supported EntryPoint address
            entryPoint
        ]
    }
    const response = await fetch('https://api.stackup.sh/v1/node/' + process.env.STACKUP_API_KEY, {
        method: "POST",
        body: JSON.stringify(sendOpRequest),
    })

    console.log('response: ', await response.json())
}

main().catch(console.error);
