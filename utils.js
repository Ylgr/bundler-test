import {arbitrumSepolia} from "viem/chains";
import {createPublicClient, createWalletClient, getContract, http} from "viem";
import {privateKeyToAccount} from "viem/accounts";

import AccountFactoryAbi from './abi/AccountFactory.json' with { type: "json" };
import AccountAbi from './abi/Account.json' with { type: "json" };
import TokenPaymasterAbi from './abi/TokenPaymaster.json' with { type: "json" };
import EntryPointAbi from './abi/EntryPoint.json' with { type: "json" };
import JustClaimAbi from './abi/JustClaim.json' with { type: "json" };
import TokenPayAfterPaymasterAbi from './abi/TokenPayAfterPaymaster.json' with { type: "json" };
import BaseFeeTestAbi from './abi/BaseFeeTest.json' with { type: "json" };

import dotenv from "dotenv";
import {ethers} from "ethers";
import {ERC20_PAYMASTER_ABI} from "./abi/Erc20Paymaster.js";
dotenv.config()
export const currentChain = arbitrumSepolia;
export const entryPoint = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

export const AccountFactoryConfig = {
    address: process.env.ACCOUNT_FACTORY_ADDRESS,
    abi: AccountFactoryAbi
}

export const AccountConfig = (address) => {
    return {
        address: address,
        abi: AccountAbi
    }
}

export const TokenPaymasterConfig = {
    address: process.env.TOKEN_PAYMASTER_ADDRESS,
    abi: TokenPaymasterAbi
}

export const EntryPointConfig = {
    address: entryPoint,
    abi: EntryPointAbi

}

export const dummySignature = "0x0da0e8ffd79a479ff1d3abbd2259127c14d9ef8e0787632255619f380fac86a81e879b4699dadeead1bfa4e75ce6784df9eb2c6fa827a3371527d756455473ae1b"

export const client = createPublicClient({
    chain: currentChain,
    transport: http()
})

export const AccountFactoryContract = getContract({
    ...AccountFactoryConfig,
    client
});

export const TokenPaymasterContract = getContract({
    ...TokenPaymasterConfig,
    client
});

export const EntryPointContract = getContract({
    ...EntryPointConfig,
    client
});

export const AccountContract = (address) => {
    return getContract({
        ...AccountConfig(address),
        client
    });
}

export const accountLocal = privateKeyToAccount(process.env.PRIVATE_KEY);

export const walletClient = createWalletClient({
    chain: currentChain,
    account: accountLocal,
    transport: http()
})

export const JustClaimConfig = {
    address: process.env.JUST_CLAIM_ADDRESS,
    abi: JustClaimAbi
}

export const TokenPayAfterPaymasterConfig = {
    address: process.env.TOKEN_PAY_AFTER_PAYMASTER_ADDRESS,
    abi: TokenPayAfterPaymasterAbi
}

export const BaseFeeTestConfig = {
    address: process.env.BASE_FEE_TEST_ADDRESS,
    abi: BaseFeeTestAbi
}
export const providerEthers = new ethers.providers.JsonRpcProvider(currentChain.rpcUrls.default.http[0])
export const EntryPointContractEthers = new ethers.Contract(entryPoint, EntryPointAbi, providerEthers)

export const erc20Paymaster = getContract({
    abi: ERC20_PAYMASTER_ABI,
    address: "0xA4664E31b1f9ea3EfB595AC33267a242aaeA182c",
    client: client,
})
