import {
    AccountConfig,
    AccountFactoryConfig,
    accountLocal,
    client, dummySignature, entryPoint,
    EntryPointConfig, JustClaimConfig, TokenPayAfterPaymasterConfig,
    TokenPaymasterConfig
} from "./utils.js";
import {concatHex, encodeFunctionData, encodePacked, maxUint256, parseEther, toBytes, toHex} from "viem";

const bundlerEndpoint =
    process.env.STACKUP_API_KEY ? 'https://api.stackup.sh/v1/node/' + process.env.STACKUP_API_KEY :
        process.env.ALCHEMY_API_KEY ? 'https://arb-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY:
            process.env.PIMLICO_API_KEY ? 'https://api.pimlico.io/v2/421614/rpc?apikey=' + process.env.PIMLICO_API_KEY : null;

async function main() {
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

    let initCode = '0x';
    const senderDeployCode = await client.getCode({address: sender});
    if(!senderDeployCode){
        initCode = encodePacked(["bytes", "bytes"], [
            encodePacked(["bytes"], [AccountFactoryConfig.address]),
            encodeFunctionData({
                abi: AccountFactoryConfig.abi,
                functionName: 'createAccount',
                args: [accountLocal.address, 0n]
            })
        ])
    }
    console.log('initCode: ', initCode)

    const callData = encodeFunctionData({
        abi: AccountConfig(sender).abi,
        functionName: 'executeBatch',
        args: [
            [TokenPaymasterConfig.address, JustClaimConfig.address],
            [0n, 0n],
            [
                encodeFunctionData({
                    abi: TokenPaymasterConfig.abi,
                    functionName: 'approve',
                    args: [TokenPayAfterPaymasterConfig.address, maxUint256],
                }),
                encodeFunctionData({
                    abi: JustClaimConfig.abi,
                    functionName: 'claim',
                    args: [sender, parseEther("1000")],
                }),
            ],
        ],
    });

    const callGasLimit = toHex(268692);
    const verificationGasLimit = toHex(75203);
    const preVerificationGas = toHex(3000000);
    const maxFeePerGas = toHex(157500000);
    const maxPriorityFeePerGas = toHex(5250000);
    const paymasterAndData = concatHex([TokenPayAfterPaymasterConfig.address, TokenPaymasterConfig.address]);
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
