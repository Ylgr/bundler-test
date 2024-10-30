import {createBundlerClient, entryPoint06Address, toCoinbaseSmartAccount} from "viem/account-abstraction";
import {
    AccountConfig,
    AccountFactoryConfig,
    accountLocal,
    client,
    currentChain,
    EntryPointConfig,
    TokenPaymasterConfig
} from "./utils.js";
import {encodeFunctionData, http, maxUint256, toHex} from "viem";
import {createPimlicoClient} from "permissionless/clients/pimlico";
import {toSimpleSmartAccount} from "permissionless/accounts";

const bundlerEndpoint =
    process.env.STACKUP_API_KEY ? 'https://api.stackup.sh/v1/node/' + process.env.STACKUP_API_KEY :
        process.env.ALCHEMY_API_KEY ? 'https://arb-sepolia.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY:
            process.env.PIMLICO_API_KEY ? 'https://api.pimlico.io/v2/421614/rpc?apikey=' + process.env.PIMLICO_API_KEY : null;

const usdcAddress = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'

async function main() {
    const account = await toCoinbaseSmartAccount({
        client,
        owners: [accountLocal],
    })
    // console.log('AccountFactoryConfig.address: ', AccountFactoryConfig.address)
    // const account = await toSimpleSmartAccount({
    //     client,
    //     owner: accountLocal,
    //     factoryAddress: AccountFactoryConfig.address,
    //     address: '0x227c204eA113955a37c36F90bee1dC7204cf697e',
    //     entryPoint: {
    //         address: entryPoint06Address,
    //         version: "0.6",
    //     }
    // })
    console.log('account: ', account)

    // const account = await toCoinbaseSmartAccount({
    //     client,
    //     owners: [accountLocal],
    // })

    const pimlicoClient = createPimlicoClient({
        chain: currentChain,
        transport: http(bundlerEndpoint),
        entryPoint: {
            address: entryPoint06Address,
            version: "0.6",
        },
    })

    const bundlerClient = createBundlerClient({
        client,
        transport:  http(bundlerEndpoint),
        account,
        paymaster: pimlicoClient,
    })

    const nonce = await client.readContract({
        ...EntryPointConfig,
        functionName: 'getNonce',
        args: [account.address, 0n],
    })

    // const userOperation = await bundlerClient.prepareUserOperation({
    //     calls: [{
    //         to: '0xeaBcd21B75349c59a4177E10ed17FBf2955fE697',
    //         value: 0n,
    //     }],
    //         paymasterContext: {
    //             token: usdcAddress,
    //         },
    //     nonce: nonce,
    // })
    // console.log('userOperation: ', userOperation)

    // const callData = encodeFunctionData({
    //     abi: AccountConfig(account.address).abi,
    //     functionName: 'execute',
    //     args: [
    //         usdcAddress,
    //         0n,
    //         encodeFunctionData({
    //             abi: TokenPaymasterConfig.abi,
    //             functionName: 'approve',
    //             args: ['0x00000000000000fb866daaa79352cc568a005d96', maxUint256],
    //             // args: [usdcPaymasterAddress, 0],
    //         }),
    //     ],
    // });
    const hash = await bundlerClient.sendUserOperation({
        calls: [{
            to: usdcAddress,
            value: 0n,
            data: encodeFunctionData({
                abi: TokenPaymasterConfig.abi,
                functionName: 'approve',
                args: ['0x00000000000000fb866daaa79352cc568a005d96', maxUint256],
                // args: [usdcPaymasterAddress, 0],
            })
        }],
        nonce: nonce,
        // paymasterAndData: TokenPaymasterConfig.address,
        paymasterContext: {
            token: usdcAddress,
        },
    });
    console.log('hash: ', hash)
    const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash
    })
}

main().catch(console.error);
