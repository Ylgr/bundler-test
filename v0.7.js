import {
    AccountConfig,
    AccountFactory07Config,
    accountLocal,
    client, currentChain, dummySignature,
    EntryPoint07Config,
    TokenPaymaster07Config
} from "./utils.js";
import {encodeFunctionData, encodePacked, toBytes, toHex} from "viem";
import {ethers} from "ethers";
import {entryPoint07Address, getUserOperationHash, toPackedUserOperation} from "viem/account-abstraction";

const bundlerEndpoint =
    process.env.STACKUP_API_KEY ? 'https://api.stackup.sh/v1/node/' + process.env.STACKUP_API_KEY :
        process.env.ALCHEMY_API_KEY ? 'https://arb-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY:
            process.env.PIMLICO_API_KEY ? 'https://api.pimlico.io/v2/421614/rpc?apikey=' + process.env.PIMLICO_API_KEY : null;

async function main() {
    console.log('dasdsdas')
    // console.log('accountLocal.address: ', accountLocal.address)
    // const sender = await AccountFactoryContract.read.accountImplementation();
    // const sender = await AccountFactoryContract.read.getAddress(accountLocal.address, 0n);
    const sender = await client.readContract({
        ...AccountFactory07Config,
        functionName: 'getAddress',
        args: [accountLocal.address, 0n],
    })
    console.log('sender: ', sender)
    const nonce = toHex(await client.readContract({
        ...EntryPoint07Config,
        functionName: 'getNonce',
        args: [sender, 0n],
    }))
    console.log('nonce: ', nonce)
    let factory = '0x';
    let factoryData = '0x';
    const senderDeployCode = await client.getCode({address: sender});
    if(!senderDeployCode){
        factory = AccountFactory07Config.address;
        factoryData = encodeFunctionData({
            abi: AccountFactory07Config.abi,
            functionName: 'createAccount',
            args: [accountLocal.address, 0n]
        });
    }
    const callData = encodeFunctionData({
        abi: AccountConfig(sender).abi,
        functionName: 'execute',
        args: [
            TokenPaymaster07Config.address,
            0n,
            encodeFunctionData({
                abi: TokenPaymaster07Config.abi,
                functionName: 'transfer',
                args: [accountLocal.address, 100n],
            }),
        ],
    });
    const callGasLimit = toHex(268692);
    const verificationGasLimit = toHex(75203);
    const preVerificationGas = toHex(1000000n);
    const maxFeePerGas = toHex(157500000);
    const maxPriorityFeePerGas = toHex(5250000);
    const paymaster = TokenPaymaster07Config.address;
    const paymasterData = '0x';
    const paymasterVerificationGasLimit = toHex(1000000n);
    const paymasterPostOpGasLimit = toHex(1000000n);
    const signature = dummySignature;
    let userOperation = {
        sender,
        nonce,
        factory,
        factoryData,
        callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymaster,
        paymasterData,
        paymasterVerificationGasLimit,
        paymasterPostOpGasLimit,
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
            entryPoint07Address
        ]
    }
    console.log('bundlerEndpoint: ', bundlerEndpoint)
    console.log('sendOpRequest: ', JSON.stringify(toPackedUserOperation(userOperation)))
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
    // try {
    //     const gasPrice = await providerEthers.getGasPrice()
    //     await EntryPointContractEthers.callStatic.simulateHandleOp(userOperation, sender, callData, {gasPrice})
    // }catch (e) {
    //     console.log('e.errorArgs: ', e.errorArgs)
    //     console.log('e.errorArgs.paid: ', e.errorArgs.paid.toString())
    //
    // }
    const userOperationHash = await getUserOperationHash({
        chainId: currentChain.id,
        userOperation,
        entryPointVersion: "0.7",
        entryPointAddress: entryPoint07Address,
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
            entryPoint07Address
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
// 0x0000000000000000000000000000000000000000
