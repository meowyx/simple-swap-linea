"use client";

import { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CONTRACT_ADDRESS, ABI } from "../../constants";
import { client } from "@/providers/WagmiProvider";
import * as Icons from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const coins = ["ETH", "CoinA", "CoinB", "CoinC"];

export default function CustomSwap() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [connected, setConnected] = useState(false);
  const [fromCoin, setFromCoin] = useState("ETH");
  const [toCoin, setToCoin] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [balances, setBalances] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (address) {
      setConnected(true);
      loadBalances();
    } else {
      setConnected(false);
    }
  }, [address]);

  const loadBalances = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const newBalances: { [key: string]: string } = {};
      for (const coin of coins) {
        if (coin === "ETH") {
          const ethBalance = await client.getBalance({ address });
          newBalances[coin] = formatUnits(ethBalance, 18);
        } else {
          const balance = await getBalance(coin);
          newBalances[coin] = balance;
        }
      }
      setBalances(newBalances);
    } catch (error) {
      console.error("Error loading balances:", error);
      setError("Failed to load balances");
    } finally {
      setLoading(false);
    }
  };

  const getBalance = async (tokenName: string) => {
    if (!address) return "0";
    try {
      const balance = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "getBalance",
        args: [tokenName, address],
      });
      return formatUnits(balance as bigint, 18);
    } catch (error) {
      console.error("Error getting balance:", error);
      return "0";
    }
  };

  const handleSwap = async () => {
    if (!walletClient || !address) return;
    setLoading(true);
    setError("");

    try {
      let request;
      if (fromCoin === "ETH") {
        const { request: req } = await client.simulateContract({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "swapEthToToken",
          args: [toCoin],
          account: address,
          value: parseUnits(fromAmount, 18),
        });
        request = req;
      } else if (toCoin === "ETH") {
        const { request: req } = await client.simulateContract({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "swapTokenToEth",
          args: [fromCoin, parseUnits(fromAmount, 18)],
          account: address,
        });
        request = req;
      } else {
        const { request: req } = await client.simulateContract({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "swapTokenToToken",
          args: [fromCoin, toCoin, parseUnits(fromAmount, 18)],
          account: address,
        });
        request = req;
      }

      await walletClient.writeContract(request);
      await loadBalances();
      setFromAmount("");
      setToAmount("");
    } catch (error) {
      console.error("Error swapping:", error);
      setError("Swap failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-[#f1f5f9] dark:text-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <nav>
            <ul className="flex space-x-1 bg-[#1e293b] rounded-full p-1">
              {["Swap", "Pool", "Vote", "Charts"].map((item) => (
                <li key={item}>
                  <Button
                    variant="ghost"
                    className="text-sm rounded-full text-gray-300 hover:text-white hover:bg-[#334155]"
                  >
                    {item}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
          <Button
            variant="outline"
            onClick={() => setConnected(!connected)}
            className="bg-white text-[#1e293b] hover:bg-gray-100 border-[#1e293b]"
          >
            {connected ? "Disconnect" : "Connect Wallet"}
          </Button>
        </header>

        <main className="max-w-md mx-auto">
          <div className="bg-[#1e293b] rounded-lg p-6 space-y-4 shadow-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Swap</h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
              >
                <Icons.GearIcon className="h-6 w-6" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between bg-[#334155] rounded-lg p-4">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="bg-transparent border-none text-2xl w-1/2 text-white placeholder-gray-400"
                />
                <Select value={fromCoin} onValueChange={setFromCoin}>
                  <SelectTrigger className="w-[100px] bg-[#475569] text-white border-none">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] text-white">
                    {coins.map((coin) => (
                      <SelectItem
                        key={coin}
                        value={coin}
                        className="hover:bg-[#334155]"
                      >
                        {coin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-right text-sm text-gray-400">
                Balance: {balances[fromCoin] || "0"}
              </div>

              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-[#334155] text-white hover:bg-[#475569]"
                  onClick={() => {
                    setFromCoin(toCoin);
                    setToCoin(fromCoin);
                    setFromAmount(toAmount);
                    setToAmount(fromAmount);
                  }}
                >
                  <Icons.ChevronDownIcon className="h-6 w-6" />
                </Button>
              </div>

              <div className="flex justify-between bg-[#334155] rounded-lg p-4">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  onChange={(e) => setToAmount(e.target.value)}
                  className="bg-transparent border-none text-2xl w-1/2 text-white placeholder-gray-400"
                />
                <Select value={toCoin} onValueChange={setToCoin}>
                  <SelectTrigger className="w-[100px] bg-[#475569] text-white border-none">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] text-white">
                    {coins.map((coin) => (
                      <SelectItem
                        key={coin}
                        value={coin}
                        className="hover:bg-[#334155]"
                      >
                        {coin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-right text-sm text-gray-400">
                Balance: {balances[toCoin] || "0"}
              </div>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <Button
              className="w-full bg-[#475569] hover:bg-[#64748b] text-white"
              onClick={handleSwap}
              disabled={!connected || !fromAmount || !toCoin || loading}
            >
              {loading
                ? "Processing..."
                : connected
                ? "Swap"
                : "Connect Wallet"}
            </Button>
          </div>
        </main>

        <footer className="mt-8 flex justify-center space-x-4">
          {["CoinA", "CoinB", "CoinC"].map((coin) => (
            <Button
              key={coin}
              variant="outline"
              className="bg-[#1e293b] text-white border-none hover:bg-[#334155]"
            >
              {coin} <span className="mx-2">-</span>{" "}
              <Icons.CopyIcon className="h-4 w-4" />
            </Button>
          ))}
        </footer>
      </div>
    </div>
  );
}
