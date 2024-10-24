import {
    AccountConfig,
    AccountFactoryConfig,
    accountLocal,
    client, dummySignature, entryPoint,
    EntryPointConfig, Erc20PaymasterConfig, guarantorWalletClient,
    TokenPaymasterConfig
} from "./utils.js";
import {encodeFunctionData, encodePacked, maxUint256, pad, toBytes, toHex} from "viem";
import {privateKeyToAddress, sign} from "viem/accounts";

const bundlerEndpoint =
    process.env.STACKUP_API_KEY ? 'https://api.stackup.sh/v1/node/' + process.env.STACKUP_API_KEY :
        process.env.ALCHEMY_API_KEY ? 'https://arb-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY:
            process.env.PIMLICO_API_KEY ? 'https://api.pimlico.io/v2/421614/rpc?apikey=' + process.env.PIMLICO_API_KEY : null;

// 0x0000000000000000000000000000000000000000
const usdcAddress = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
const usdcPaymasterAddress = '0x8E257C874f150dF96D3F171563504d5e85366849'
async function main() {
    // await guarantorWalletClient.writeContract({
    //     address: usdcAddress,
    //     abi: TokenPaymasterConfig.abi,
    //     functionName: 'approve',
    //     args: [usdcPaymasterAddress, maxUint256],
    // })
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

    const paymasterValidationGas = toHex(1000000n);
    const paymasterPostOpGas = toHex(1000000n);

    // const paymasterAndData = TokenPaymasterConfig.address;
    const paymasterAndData = encodePacked(['address', 'uint128', 'uint128'], [usdcPaymasterAddress,paymasterValidationGas, paymasterPostOpGas]);
    // const paymasterAndData = '0x';
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

    console.log('setup sponsor')
    const validAfter = 0
    const validUntil = Math.floor((Date.now() / 1000)) + 3600 // valid for 1 hour

// getting the hash to sign
    const hash = await client.readContract({
        ...Erc20PaymasterConfig,
        functionName: 'getHash',
        args: [
            userOperation,
            validUntil,
            validAfter,
            0n
        ],
    })
    console.log('hash: ', hash)
const guarantorPrivateKey = process.env.GUARANTOR_PRIVATE_KEY
// signing the hash
    const { r, s, v } = await sign({ hash, privateKey: guarantorPrivateKey})
    const guarantorSignature = encodePacked(
        ["bytes32", "bytes32", "uint8"],
        [pad(r), pad(s), Number(v)]
    )

// creating paymaster and data for a Mode2 sponsor
    const mode2PaymasterData = encodePacked(
        ['address', 'uint128', 'uint128', "bytes1", "address", "bytes6", "bytes6", "bytes"],
        [
            usdcPaymasterAddress,paymasterValidationGas, paymasterPostOpGas,
            "0x02",
            privateKeyToAddress(guarantorPrivateKey),
            toHex(validUntil, { size: 6 }),
            toHex(validAfter, { size: 6 }),
            guarantorSignature,
        ],
    )

// append paymaster data to userOperation
    let sponsoredUserOperation = {
        ...userOperation,
        paymasterAndData: mode2PaymasterData,
    }

    const sendOpRequest = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_estimateUserOperationGas",
        "params": [
            // UserOperation object
            sponsoredUserOperation,
            // Supported EntryPoint address
            entryPoint
        ]
    }
    console.log('sponsoredUserOperation: ', JSON.stringify(sponsoredUserOperation))
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
    sponsoredUserOperation = {
        ...sponsoredUserOperation,
        callGasLimit: responseJson.result.callGasLimit,
        verificationGasLimit: responseJson.result.verificationGasLimit,
        preVerificationGas: responseJson.result.preVerificationGas,
    }

    const userOperationHash = await client.readContract({
        ...EntryPointConfig,
        functionName: 'getUserOpHash',
        args: [sponsoredUserOperation],
    })
    console.log('userOperationHash: ', userOperationHash)
    const signedSignature = await accountLocal.signMessage({message: {raw: toBytes(userOperationHash)}})
    console.log('signedSignature: ', signedSignature)
    sponsoredUserOperation = {
        ...sponsoredUserOperation,
        signature: encodePacked(['bytes'], [signedSignature]),
    }
    console.log('sponsoredUserOperation: ', JSON.stringify(sponsoredUserOperation))
    const sendOpRequest2 = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_sendUserOperation",
        "params": [
            // UserOperation object
            sponsoredUserOperation,
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
