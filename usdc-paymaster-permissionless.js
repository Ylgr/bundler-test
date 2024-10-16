import {
    AccountConfig,
    AccountFactoryConfig,
    accountLocal,
    client, dummySignature, entryPoint,
    EntryPointConfig,
    TokenPaymasterConfig
} from "./utils.js";
import {encodeFunctionData, encodePacked, maxUint256, toBytes, toHex} from "viem";

const bundlerEndpoint =
    process.env.STACKUP_API_KEY ? 'https://api.stackup.sh/v1/node/' + process.env.STACKUP_API_KEY :
        process.env.ALCHEMY_API_KEY ? 'https://arb-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY:
            process.env.PIMLICO_API_KEY ? 'https://api.pimlico.io/v2/421614/rpc?apikey=' + process.env.PIMLICO_API_KEY : null;

// 0x0000000000000000000000000000000000000000
const usdcPaymasterAddress = '0x8E257C874f150dF96D3F171563504d5e85366849'
async function main() {
    console.log('usdc-paymaster-permissionless')
    const sender = await client.readContract({
        ...AccountFactoryConfig,
        functionName: 'getAddress',
        args: [accountLocal.address, 0n],
    })
    console.log('sender: ', sender)
    const nonce = toHex(await client.readContract({
        ...EntryPointConfig,
        functionName: 'getNonce',
        args: [sender, 0n],
    }))
    console.log('nonce: ', nonce)
    const initCode = '0x';
    const callData = encodeFunctionData({
        abi: AccountConfig(sender).abi,
        functionName: 'execute',
        args: [
            '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
            0n,
            encodeFunctionData({
                abi: TokenPaymasterConfig.abi,
                functionName: 'approve',
                args: [usdcPaymasterAddress, maxUint256],
                // args: [usdcPaymasterAddress, 0],
            }),
        ],
    });
    const callGasLimit = toHex(268692);
    const verificationGasLimit = toHex(75203);
    const preVerificationGas = toHex(1000000n);
    const maxFeePerGas = toHex(157500000);
    const maxPriorityFeePerGas = toHex(5250000);

    // const paymasterAndData = TokenPaymasterConfig.address;
    const paymasterAndData = encodePacked(['address', 'bytes1'], ['0x8E257C874f150dF96D3F171563504d5e85366849', '0x00']);

    const signature = dummySignature;
    let userOperation = {
        sender,
        nonce,
        initCode,
        callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData,
        signature,
    }

    const sendOpRequest = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_estimateUserOperationGas",
        "params": [
            // UserOperation object
            userOperation,
            // Supported EntryPoint address
            entryPoint
        ]
    }
    console.log('bundlerEndpoint: ', bundlerEndpoint)
    console.log('sendOpRequest: ', sendOpRequest)
    const response = await fetch(
        bundlerEndpoint,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(sendOpRequest),
        })

    const responseJson = await response.json();
    console.log('responseJson: ', responseJson)
    userOperation = {
        ...userOperation,
        callGasLimit: responseJson.result.callGasLimit,
        verificationGasLimit: responseJson.result.verificationGasLimit,
        preVerificationGas: responseJson.result.preVerificationGas,
    }

    const userOperationHash = await client.readContract({
        ...EntryPointConfig,
        functionName: 'getUserOpHash',
        args: [userOperation],
    })
    console.log('userOperationHash: ', userOperationHash)
    const signedSignature = await accountLocal.signMessage({message: {raw: toBytes(userOperationHash)}})
    console.log('signedSignature: ', signedSignature)
    userOperation = {
        ...userOperation,
        signature: encodePacked(['bytes'], [signedSignature]),
    }
    console.log('userOperation: ', userOperation)
    const sendOpRequest2 = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_sendUserOperation",
        "params": [
            // UserOperation object
            userOperation,
            // Supported EntryPoint address
            entryPoint
        ]
    }
    const response2 = await fetch(bundlerEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(sendOpRequest2),
    })
    const responseJson2 = await response2.json();
    console.log('responseJson2: ', responseJson2)
}

main().catch(console.error);
