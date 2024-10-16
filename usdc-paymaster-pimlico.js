import {
    AccountConfig,
    AccountFactoryConfig,
    accountLocal,
    client, currentChain, dummySignature, entryPoint,
    EntryPointConfig,
    TokenPaymasterConfig, walletClient
} from "./utils.js";
import {encodeFunctionData, encodePacked, maxUint256, toBytes, toHex} from "viem";

const bundlerEndpoint =
    process.env.STACKUP_API_KEY ? 'https://api.stackup.sh/v1/node/' + process.env.STACKUP_API_KEY :
        process.env.ALCHEMY_API_KEY ? 'https://arb-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY:
            process.env.PIMLICO_API_KEY ? 'https://api.pimlico.io/v2/421614/rpc?apikey=' + process.env.PIMLICO_API_KEY : null;

// 0x0000000000000000000000000000000000000000
const usdcPaymasterAddress = '0x00000000000000fb866daaa79352cc568a005d96'
const usdcAddress = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
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
            usdcAddress,
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
    const paymasterAndData = '0x';

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

    const paymasterReq = {
        "jsonrpc": "2.0",
        "id": 1,
        // "method": "pm_getPaymasterData",
        "method": "pm_getPaymasterStubData",
        "params": [
            // UserOperation object
            userOperation,
            // Supported EntryPoint address
            entryPoint,
            toHex(currentChain.id),
            {
                token: usdcAddress
            }
        ]
    }
    console.log('bundlerEndpoint: ', bundlerEndpoint)
    console.log('paymasterReq: ', paymasterReq)
    const paymasterRes = await fetch(
        'https://api.pimlico.io/v2/421614/rpc?apikey=' + process.env.PIMLICO_API_KEY,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(paymasterReq),
        })

    const paymasterData = await paymasterRes.json();
    console.log('paymasterData: ', paymasterData)
    userOperation = {
        ...userOperation,
        paymasterAndData: paymasterData.result.paymasterAndData,
    }

    const estimateGasReq = {
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
    const estimateGasRes = await fetch(
        bundlerEndpoint,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(estimateGasReq),
        })

    const estimateGas = await estimateGasRes.json();
    console.log('estimateGas: ', estimateGas)
    userOperation = {
        ...userOperation,
        callGasLimit: estimateGas.result.callGasLimit,
        verificationGasLimit: estimateGas.result.verificationGasLimit,
        preVerificationGas: estimateGas.result.preVerificationGas,
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

    // const result = await walletClient.writeContract({
    //     ...EntryPointConfig,
    //     functionName: 'handleOps',
    //     args: [userOperation, walletClient.account.address],
    //     gas: 20000000,
    //     gasPrice: 5000000000
    // })
    // console.log('result: ', result)
}

main().catch(console.error);
