import React, { useState, useEffect } from "react";
import { useGameState } from "./hooks/useGameState";
import { ExtractView } from "./views/ExtractView";
import { FusionView } from "./views/FusionView";
import { ForgeTabView } from "./views/ForgeTabView";
import { CombatView } from "./views/CombatView";
import { MissionsView } from "./views/MissionsView";
import { BlackMarketView } from "./views/BlackMarketView";
import { GalleryView } from "./views/GalleryView";
import { Dialog } from "./components/ui/Dialog";
import { Toast } from "./components/ui/Toast";
import { MiniCard } from "./components/MiniCard";
import { FullCard } from "./components/FullCard";
import { APP_VERSION, ELEMENTS, IMAGE_MODELS } from "./lib/constants";
import { dbService } from "./lib/db";
import { generateImageFromAi } from "./services/ai";
import { InstructionModal } from "./components/InstructionModal";
import { Card } from "./types";
import { ReshootDialog } from "./components/ReshootDialog";
import { ApiMonitor } from "./components/ApiMonitor";
import { getDismantleValue, getDismantleDustValue, getRankIndex } from "./lib/gameLogic";

type Tab = "extract" | "forge" | "combat" | "missions" | "blackmarket" | "gallery";

export default function App() {
  const {
    currency,
    modifyCurrency,
    hasEnoughCurrency,
    level,
    experience,
    gainExperience,
    pityCounter,
    updatePity,
    inventory,
    modifyInventory,
    quests,
    setQuests,
    updateQuestProgress,
    expeditions,
    setExpeditions,
    startExpedition,
    completeExpedition,
    claimExpedition,
    cards,
    addCard,
    removeCard,
    updateCard,
    squad,
    setSquad,
    leaderId,
    setLeaderId,
    eliteEnemySquad,
    setEliteEnemySquad,
    battlefieldEnemySquad,
    setBattlefieldEnemySquad,
    fusionSlot1,
    setFusionSlot1,
    fusionSlot2,
    setFusionSlot2,
    config,
    saveConfig,
    isProcessing,
    setIsProcessing,
    resetGame,
  } = useGameState();

  const [activeTab, setActiveTab] = useState<Tab>("extract");
  const [dbStatus, setDbStatus] = useState(dbService.getStatus());
  const [showInstructions, setShowInstructions] = useState(false);

  // Modals state
  const [showSettings, setShowSettings] = useState(false);
  const [modalCardId, setModalCardId] = useState<string | null>(null);
  const [selectorTarget, setSelectorTarget] = useState<
    "squad1" | "squad2" | "squad3" | "squad4" | "squad5" | "squad6" | "fusion1" | "fusion2" | null
  >(null);

  // Dialog state
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm";
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
  });

  // Toast state
  const [toast, setToast] = useState<{
    msg: string;
    type: "error" | "success" | "info";
  } | null>(null);
  
  // Sidebar visibility
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCombatActive, setIsCombatActive] = useState(false);

  // Settings form state
  const [tempConfig, setTempConfig] = useState(config);
  const [reshootingCards, setReshootingCards] = useState<Set<string>>(
    new Set(),
  );
  const [reshootTarget, setReshootTarget] = useState<Card | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = dbService.getStatus();
      setDbStatus((prev) => (prev !== currentStatus ? currentStatus : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTempConfig(config);
  }, [config, showSettings]);

  const handleResetGame = () => {
    handleConfirm(
      "Toàn bộ tiến trình chơi, dữ liệu thẻ bài, cài đặt hệ thống và Data Credits sẽ bị xóa vĩnh viễn. Bạn có chắc chắn thực hiện?",
      async () => {
        await resetGame();
        setToast({
          msg: "Đã thiết lập lại hệ thống thành công!",
          type: "info",
        });
        setTimeout(() => setToast(null), 3000);
      },
    );
  };

  const handleAlert = (title: string, message: string) => {
    setDialogConfig({ isOpen: true, title, message, type: "alert" });
  };

  const handleConfirm = (message: string, onConfirm: () => void) => {
    setDialogConfig({
      isOpen: true,
      title: "Xác Nhận Hành Động",
      message,
      type: "confirm",
      onConfirm,
    });
  };

  const handleSelectCard = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;

    if (selectorTarget?.startsWith("fusion")) {
      const slot = selectorTarget === "fusion1" ? 1 : 2;
      if (card.cardClass === "UR")
        return handleAlert(
          "Lỗi",
          "Tài nguyên DNA Cấp UR quá mạnh. Buồng lai tạo không thể chịu tải!",
        );
      if (slot === 1 && fusionSlot2?.id === id)
        return handleAlert("Lỗi", "Thẻ này đã đặt ở Thể Gốc Omega!");
      if (slot === 2 && fusionSlot1?.id === id)
        return handleAlert("Lỗi", "Thẻ này đã đặt ở Thể Gốc Alpha!");
      if (slot === 1) setFusionSlot1(card);
      else setFusionSlot2(card);
    } else if (selectorTarget?.startsWith("squad")) {
      const sIdx = parseInt(selectorTarget.replace("squad", "")) - 1;
      if (squad.some((c, idx) => c?.id === id && idx !== sIdx))
        return handleAlert("Lỗi", "Nhân vật này đã có mặt trong đội hình!");
      const newSquad = [...squad];
      newSquad[sIdx] = card;
      setSquad(newSquad);
    }
    setSelectorTarget(null);
  };

  const handleCompleteFusion = async (
    newCard: Card,
    oldIdsToDelete: string[]
  ) => {
    for (const id of oldIdsToDelete) {
      await removeCard(id);
    }
    await addCard(newCard);
    setFusionSlot1(null);
    setFusionSlot2(null);
    updateQuestProgress('fusion', 1);
  };

  const handleReshootTrigger = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (card) setReshootTarget(card);
  };

  const handleReshootConfirm = async (modelId: string) => {
    if (!reshootTarget) return;
    const card = reshootTarget;
    setReshootTarget(null);

    if (currency < 50)
      return handleAlert(
        "Lỗi",
        "Không đủ Data Credits. Cần 50 DC để mở Studio Chụp ảnh.",
      );

    handleConfirm(
      `Tổ chức Photoshoot mới cho <strong>${card.name}</strong>?<br>Model: <strong>${IMAGE_MODELS.find((m) => m.id === modelId)?.name || modelId}</strong><br>Phí Studio: <span class="text-red-400 font-bold">-50 DC</span>`,
      async () => {
        if (currency < 50) {
            return handleAlert("Lỗi", "Không đủ Data Credits.");
        }
        
        modifyCurrency(-50);
        setReshootingCards((prev) => new Set(prev).add(card.id));

        try {
          // Clone card and remove imageUrl to ensure AI generates a NEW one
          const cardForAi = { ...card };
          delete cardForAi.imageUrl;
          delete cardForAi.imageBlob;

          const newImgUrl = await generateImageFromAi(cardForAi, config, modelId, true);
          const cardToUpdate = { ...card };
          if (newImgUrl.startsWith("data:image")) {
            cardToUpdate.imageUrl = newImgUrl;
            delete cardToUpdate.imageBlob;
          } else {
            cardToUpdate.imageUrl = newImgUrl;
          }
          await updateCard(cardToUpdate);
          
          // Ensure the local state is refreshed
          setToast({ msg: "Đang lưu trữ dữ liệu ảnh mới...", type: "info" });
          
          handleAlert("Photoshoot hoàn tất", "Trang bìa mới đã được cập nhật thành công.");
        } catch (e) {
          modifyCurrency(50);
          handleAlert("Lỗi", "Sự cố tại Phim trường. Đã hoàn trả 50 DC.");
        } finally {
          setReshootingCards((prev) => {
            const s = new Set(prev);
            s.delete(card.id);
            return s;
          });
        }
      },
    );
  };

  const handleDismantle = (cardId: string) => {
    const c = cards.find((x) => x.id === cardId);
    if (!c) return;
    
    const rankIdx = getRankIndex(c.cardClass);
    const dcVal = getDismantleValue(c.cardClass);
    const baseDust = getDismantleDustValue(c.cardClass);

    let bonusItem: string | null = null;
    let bonusAmount = 0;
    let confirmMsg = `Phân giải <strong>${c.name}</strong>?<br>Nhận: <span class="text-green-400 font-bold">+${dcVal} DC</span>`;

    // Roll for SR+ (rankIdx >= 2)
    if (rankIdx >= 2) {
      const roll = Math.random() * 100;
      if (rankIdx === 2) { // SR
        if (roll < 40) { // 40% chance for Shard
          bonusItem = ["Fire Shard", "Water Shard", "Earth Shard", "Lightning Shard", "Wind Shard"][Math.floor(Math.random() * 5)];
          bonusAmount = 1 + Math.floor(Math.random() * 2); // 1-2
        } else {
          bonusItem = "Quantum Dust";
          bonusAmount = baseDust;
        }
      } else if (rankIdx === 3) { // SSR
        if (roll < 60) { // 60% chance for Core
          bonusItem = ["Tech Core", "Magic Core", "Mutant Core", "Light Core", "Dark Core"][Math.floor(Math.random() * 5)];
          bonusAmount = 1;
        } else {
          bonusItem = "Quantum Dust";
          bonusAmount = baseDust;
        }
      } else if (rankIdx === 4) { // UR
        if (roll < 75) { // 75% chance for Cores
          bonusItem = ["Tech Core", "Magic Core", "Mutant Core", "Light Core", "Dark Core"][Math.floor(Math.random() * 5)];
          bonusAmount = 2;
        } else {
          bonusItem = "Quantum Dust";
          bonusAmount = baseDust;
        }
      } else {
         // Fallback just in case
         bonusItem = "Quantum Dust";
         bonusAmount = baseDust;
      }
    } else if (baseDust > 0) {
      bonusItem = "Quantum Dust";
      bonusAmount = baseDust;
    }

    if (bonusItem && bonusAmount > 0) {
      const color = bonusItem.includes("Core") ? "text-cinematic-gold" : bonusItem.includes("Shard") ? "text-cinematic-cyan" : "text-purple-400";
      confirmMsg += ` & <span class="${color} font-bold">+${bonusAmount} ${bonusItem}</span>`;
      confirmMsg += `<br><span class="text-[10px] text-zinc-500 italic">(Dismantle SR+ has chance for bonus core/shard)</span>`;
    }

    handleConfirm(
      confirmMsg,
      async () => {
        await removeCard(cardId);
        modifyCurrency(dcVal);
        
        let toastMsg = `Thu hồi +${dcVal} DC`;
        
        if (bonusItem && bonusAmount > 0) {
          if (bonusItem === "Quantum Dust") {
            modifyInventory(0, 0, {}, bonusAmount);
            toastMsg += ` và +${bonusAmount} Dust`;
          } else {
            modifyInventory(0, 0, { [bonusItem]: bonusAmount });
            toastMsg += ` và +${bonusAmount} ${bonusItem}`;
          }
        }
        
        setToast({ msg: toastMsg + '.', type: "success" });
        setModalCardId(null);
      },
    );
  };

  const handleTranslateCard = async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const targetLang = config.language || "vi";

    setIsProcessing(true);
    try {
      const { translateCardWithAI } = await import("./services/ai");
      const translatedProps = await translateCardWithAI(
        card,
        targetLang,
        config,
      );
      const cardToUpdate = { ...card };
      if (!cardToUpdate.translations) cardToUpdate.translations = {};
      cardToUpdate.translations[targetLang] = translatedProps;

      await updateCard(cardToUpdate);
      setToast({ msg: "Đã dịch thuật thành công!", type: "success" });
    } catch (e: any) {
      handleAlert("Lỗi Dịch thuật", e.message || "Dịch vụ AI đang bận.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAltText = async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    setIsProcessing(true);
    try {
      const { generateAltTextFromAI } = await import("./services/ai");
      const altText = await generateAltTextFromAI(card, config);
      const cardToUpdate = { ...card, altText };
      await updateCard(cardToUpdate);
      setToast({ msg: "Đã tạo Alt Text thành công!", type: "success" });
    } catch (e: any) {
      handleAlert("Lỗi AI Vision", e.message || "Dịch vụ AI đang bận.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-cinematic-950 overflow-hidden flex flex-col sm:flex-row font-sans selection:bg-cinematic-cyan/30 selection:text-white relative text-gray-200">
      {/* Noise & Glow overlay */}
      <div className="fixed inset-0 z-40 noise-overlay pointer-events-none opacity-40 mix-blend-overlay"></div>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" id="bgAmbient">
        {/* Dynamic ambient lights based on tab */}
        <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] opacity-20 transform transition-colors duration-1000 ${
            activeTab === "combat" ? "bg-red-600" : 
            activeTab === "extract" ? "bg-cinematic-cyan" : 
            "bg-blue-600"
          }`}></div>
        <div className={`absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[160px] opacity-20 transform transition-colors duration-1000 ${
            activeTab === "forge" ? "bg-cinematic-gold" : 
            "bg-indigo-600"
          }`}></div>
      </div>

      {/* Navigation (Sidebar Desktop / Bottom Bar Mobile) */}
      <nav className={`fixed bottom-0 left-0 right-0 sm:relative z-40 bg-cinematic-900/90 backdrop-blur-2xl border-t sm:border-t-0 sm:border-r border-white/10 flex flex-row sm:flex-col justify-between sm:justify-start order-2 sm:order-1 shrink-0 h-[72px] sm:h-screen transition-all duration-500 ease-in-out pb-safe-offset-1 sm:pb-0 ${
        isCombatActive 
          ? "h-0 opacity-0 pointer-events-none sm:w-0 sm:opacity-0 sm:-translate-x-full overflow-hidden" 
          : "sm:w-20 md:w-64"
      }`}>
        
        {/* Logo area - desktop only */}
        <div className="hidden sm:flex items-center justify-center md:justify-start h-20 px-6 border-b border-white/5 bg-black/20">
          <div className="w-8 h-8 rounded shrink-0 bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center shadow-lg shadow-cinematic-cyan/5">
            <i className="fa-solid fa-layer-group text-cinematic-cyan"></i>
          </div>
          <div className="hidden md:block ml-3 mt-1">
            <h1 className="font-serif text-lg text-white tracking-widest font-bold leading-none">MUSE</h1>
            <span className="text-[9px] text-cinematic-cyan font-mono tracking-widest uppercase">Protocol_V2</span>
          </div>
        </div>

        {/* Links */}
        <div className="flex sm:flex-col w-full h-full sm:h-auto px-1 sm:px-3 py-1 sm:py-6 gap-0.5 sm:gap-2 justify-around sm:justify-start items-center sm:items-stretch relative">
          {/* Active indicator for mobile */}
          <div className="absolute top-0 h-[2px] bg-cinematic-cyan shadow-[0_0_15px_var(--color-cinematic-cyan)] sm:hidden transition-all duration-300 transition-position" 
               style={{ 
                 width: 'calc(100% / 6 - 8px)', 
                 left: `calc(${['extract', 'forge', 'combat', 'missions', 'blackmarket', 'gallery'].indexOf(activeTab)} * (100% / 6) + 4px)`
               }}
          ></div>

          {[
            { id: "extract", icon: "fa-dna", label: "RECRUIT" },
            { id: "forge", icon: "fa-microchip", label: "FORGE" },
            { id: "combat", icon: "fa-crosshairs", label: "COMBAT" },
            { id: "missions", icon: "fa-satellite-dish", label: "MISSIONS" },
            { id: "blackmarket", icon: "fa-store", label: "MARKET" },
            { id: "gallery", icon: "fa-address-card", label: "ARCHIVE" }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => !isProcessing && setActiveTab(btn.id as Tab)}
              className={`relative flex flex-col sm:flex-row items-center justify-center md:justify-start flex-1 sm:flex-none px-2 sm:px-4 py-2 sm:py-3.5 rounded-xl transition-all group overflow-hidden ${
                activeTab === btn.id 
                  ? "text-white sm:bg-gradient-to-r sm:from-white/10 sm:to-transparent sm:border sm:border-white/10 sm:shadow-[inset_2px_0_0_0_var(--color-cinematic-cyan)]" 
                  : "text-zinc-500 hover:text-zinc-200 active:scale-95"
              }`}
            >
              <div className={`sm:hidden absolute inset-0 transition-opacity ${activeTab === btn.id ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-cinematic-cyan/20 to-transparent"></div>
              </div>
              
              {activeTab === btn.id && (
                <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-cinematic-cyan/10 to-transparent opacity-50"></div>
              )}
              
              <i className={`fa-solid ${btn.icon} text-xl sm:text-base md:w-6 transition-all duration-300 ${
                activeTab === btn.id 
                  ? "text-cinematic-cyan drop-shadow-[0_0_8px_rgba(0,243,255,0.6)] scale-110 sm:scale-100" 
                  : "group-hover:scale-110"
              }`}></i>
              
              <span className={`mt-1 sm:mt-0 sm:ml-3 font-mono text-[8px] sm:text-[11px] font-bold tracking-widest sm:block ${
                activeTab === btn.id ? "text-white" : "text-zinc-500"
              } truncate max-w-full`}>
                {btn.label}
              </span>

              {/* Mobile Active Glow Dot */}
              <div className={`sm:hidden w-1 h-1 rounded-full bg-cinematic-cyan mt-0.5 transition-all duration-300 ${activeTab === btn.id ? 'opacity-100 scale-100 shadow-[0_0_8px_var(--color-cinematic-cyan)]' : 'opacity-0 scale-0'}`}></div>
            </button>
          ))}
        </div>

        {/* Database Status, Manual & Settings (Desktop) */}
        <div className="hidden sm:flex flex-col mt-auto p-4 border-t border-white/5 space-y-2 bg-black/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">SYS_VAULT</span>
            <div className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded border border-white/5">
               <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
               <span className={`text-[9px] font-mono ${dbStatus === 'online' ? 'text-green-500' : 'text-red-500'}`}>{dbStatus}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              onClick={() => setShowInstructions(true)}
              className="flex justify-center md:items-center gap-2 py-2 px-3 rounded-lg bg-white/5 hover:bg-cinematic-cyan/10 text-zinc-400 hover:text-cinematic-cyan transition-colors border border-white/5 group"
              title="Manual & Logs"
            >
              <i className="fa-solid fa-book-open text-[10px]"></i>
              <span className="hidden md:block text-[9px] font-mono uppercase tracking-[0.1em] font-bold">Manual</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex justify-center md:items-center gap-2 py-2 px-3 rounded-lg bg-white/5 hover:bg-cinematic-gold/10 text-zinc-400 hover:text-cinematic-gold transition-colors border border-white/5"
              title="System Config"
            >
              <i className="fa-solid fa-sliders text-[10px]"></i>
              <span className="hidden md:block text-[9px] font-mono uppercase tracking-[0.1em] font-bold">Config</span>
            </button>
          </div>

          <div className="pt-1 opacity-80 scale-90 origin-left">
            <ApiMonitor isProcessing={isProcessing} />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="relative z-20 flex-1 flex flex-col order-1 sm:order-2 h-screen w-full overflow-hidden pb-[72px] sm:pb-0">
        
        {/* Top HUD (Resources) */}
        <header className="w-full h-14 sm:h-16 border-b border-white/5 bg-cinematic-900/60 backdrop-blur-md flex items-center justify-between px-2 sm:px-6 shrink-0 relative z-[40] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          
          {/* Title - Hidden on small mobile to save space */}
          <div className="hidden xs:block">
            <h2 className="text-[10px] sm:text-sm font-serif font-bold text-white tracking-[0.15em] sm:tracking-[0.3em] uppercase opacity-80 mt-1 truncate max-w-[80px] sm:max-w-none">
              {activeTab === 'extract' && 'Gacha Core'}
              {activeTab === 'forge' && 'Bio Forge'}
              {activeTab === 'combat' && 'Tactical Ops'}
              {activeTab === 'missions' && 'Command Center'}
              {activeTab === 'blackmarket' && 'Market'}
              {activeTab === 'gallery' && 'Vault'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-4 flex-1 justify-end sm:flex-none">
             {/* Tickets - Mobile Compact View */}
             <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5 backdrop-blur-sm">
                <div className="flex items-center gap-1 px-1.5 sm:px-3 py-1 border-r border-white/10 hover:bg-white/5 rounded-l transition-colors cursor-help" title="Base Tickets">
                   <i className="fa-solid fa-ticket text-cinematic-cyan/80 text-[10px] sm:text-xs"></i>
                   <span className="font-mono text-[10px] sm:text-xs font-bold text-white">{inventory.baseTickets}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 sm:px-3 py-1 border-r border-white/10 hover:bg-white/5 transition-colors cursor-help" title="Elite Tickets">
                   <i className="fa-solid fa-ticket text-purple-400/80 text-[10px] sm:text-xs"></i>
                   <span className="font-mono text-[10px] sm:text-xs font-bold text-white">{inventory.eliteTickets}</span>
                </div>
                <div className="flex xs:flex items-center gap-1 px-1.5 sm:px-3 py-1 hover:bg-white/5 rounded-r transition-colors cursor-help" title="Quantum Dust">
                   <i className="fa-brands fa-galactic-senate text-amber-500/80 text-[10px] sm:text-xs"></i>
                   <span className="font-mono text-[10px] sm:text-xs font-bold text-amber-400">{inventory.quantumDust}</span>
                </div>
             </div>

             {/* Currency DC */}
             <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-cinematic-gold/10 to-transparent border border-cinematic-gold/20 px-2 sm:px-4 py-1.5 rounded-lg backdrop-blur-sm">
               <div className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-cinematic-gold animate-glow-pulse shadow-[0_0_10px_var(--color-cinematic-gold)]"></div>
               <span className="font-mono font-bold text-white tabular-nums tracking-wider text-xs sm:text-base">{currency}</span>
               <span className="text-[8px] sm:text-[10px] text-cinematic-gold/70 font-mono hidden xs:inline">DC</span>
             </div>

             {/* Progress Mini Bar (Mobile) / Full Bar (Desktop) */}
             <div className="flex items-center gap-2 sm:gap-3 bg-black/40 border border-cinematic-cyan/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg min-w-[60px] sm:w-40 transition-all">
                <div className="flex-1">
                   <div className="flex justify-between text-[8px] sm:text-[9px] mb-0.5 sm:mb-1 font-mono">
                      <span className="text-cinematic-cyan font-bold">LV.{level}</span>
                      <span className="text-zinc-500 hidden sm:inline">{(experience % 1000)}/1k</span>
                   </div>
                   <div className="h-0.5 sm:h-1 w-full bg-black rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-cinematic-cyan shadow-[0_0_5px_var(--color-cinematic-cyan)] transition-all duration-500" style={{ width: `${(experience % 1000) / 10}%` }}></div>
                   </div>
                </div>
             </div>
             
             {/* Mobile Settings/Info Toggle */}
             <div className="sm:hidden flex gap-1 items-center">
               <button onClick={() => setShowInstructions(true)} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 active:bg-cinematic-cyan/20 active:text-cinematic-cyan transition-colors">
                 <i className="fa-solid fa-circle-question text-xs"></i>
               </button>
               <button onClick={() => setShowSettings(true)} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 active:bg-cinematic-cyan/20 active:text-cinematic-cyan transition-colors">
                 <i className="fa-solid fa-sliders text-xs"></i>
               </button>
             </div>
          </div>
        </header>

        {/* Main Tab Render */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative scroll-smooth p-2 sm:p-4 lg:p-6 w-full">
            <div className="w-full h-full max-w-[1600px] mx-auto animate-fade-in">
        {activeTab === "extract" && (
          <ExtractView
            config={config}
            currency={currency}
            modifyCurrency={modifyCurrency}
            inventory={inventory}
            modifyInventory={modifyInventory}
            level={level}
            pityCounter={pityCounter}
            updatePity={updatePity}
            onSaveCard={addCard}
            onError={(m) => setToast({ msg: m, type: "error" })}
            onAlert={handleAlert}
            updateQuestProgress={updateQuestProgress}
            isGlobalProcessing={isProcessing}
            setGlobalProcessing={setIsProcessing}
          />
        )}
        {activeTab === "forge" && (
          <ForgeTabView
            config={config}
            currency={currency}
            modifyCurrency={modifyCurrency}
            inventory={inventory}
            cards={cards}
            modifyInventory={modifyInventory}
            onCompleteFusion={handleCompleteFusion}
            onError={(m) => setToast({ msg: m, type: "error" })}
            onAlert={handleAlert}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            fusionSlot1={fusionSlot1}
            fusionSlot2={fusionSlot2}
            setFusionSlot1={setFusionSlot1}
            setFusionSlot2={setFusionSlot2}
            onOpenSelector={(s) => setSelectorTarget(`fusion${s}`)}
          />
        )}
        {activeTab === "combat" && (
          <CombatView
            cards={cards}
            setSquad={setSquad}
            level={level}
            config={config}
            currency={currency}
            modifyCurrency={modifyCurrency}
            modifyInventory={modifyInventory}
            gainExperience={gainExperience}
            squad={squad}
            leaderId={leaderId}
            setLeaderId={setLeaderId}
            eliteEnemySquad={eliteEnemySquad}
            setEliteEnemySquad={setEliteEnemySquad}
            battlefieldEnemySquad={battlefieldEnemySquad}
            setBattlefieldEnemySquad={setBattlefieldEnemySquad}
            onOpenSquadSelector={(s) =>
              setSelectorTarget(`squad${s + 1}` as any)
            }
            onClearSquadSlot={(idx) => {
              const n = [...squad];
              n[idx] = null;
              setSquad(n);
              if (squad[idx]?.id === leaderId) setLeaderId(null);
            }}
            onError={(m) => setToast({ msg: m, type: "error" })}
            onAlert={handleAlert}
            onConfirm={handleConfirm}
            updateQuestProgress={updateQuestProgress}
            isGlobalProcessing={isProcessing}
            setGlobalProcessing={setIsProcessing}
            onBattleStatusChange={setIsCombatActive}
          />
        )}
        {activeTab === "missions" && (
            <MissionsView
                quests={quests}
                expeditions={expeditions}
                cards={cards}
                inventory={inventory}
                updateQuestProgress={updateQuestProgress}
                startExpedition={startExpedition}
                completeExpedition={completeExpedition}
                claimExpedition={claimExpedition}
                modifyCurrency={modifyCurrency}
                modifyInventory={modifyInventory}
                setQuests={setQuests}
                onAlert={handleAlert}
            />
        )}
        {activeTab === "blackmarket" && (
            <BlackMarketView
                currency={currency}
                inventory={inventory}
                cards={cards}
                modifyCurrency={modifyCurrency}
                modifyInventory={modifyInventory}
                updateCard={updateCard}
                onAlert={handleAlert}
                isGlobalProcessing={isProcessing}
                setGlobalProcessing={setIsProcessing}
                config={config}
            />
        )}

        {activeTab === "gallery" && (
            <GalleryView cards={cards} onOpenCard={setModalCardId} />
        )}
            </div>
        </main>
      </div>

      {/* OVERLAYS & MODALS */}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Dialog
        {...dialogConfig}
        onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* CARD MODAL */}
      {modalCardId && cards.find((c) => c.id === modalCardId) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/95"
            onClick={() => setModalCardId(null)}
          ></div>
          <div className="relative z-10 w-full max-w-[950px] max-h-[92vh] overflow-y-auto animate-slide-up no-scrollbar rounded-2xl bg-black shadow-2xl">
            <FullCard
              card={cards.find((c) => c.id === modalCardId)!}
              isModal={true}
              isSaved={true}
              context="gallery"
              onReshoot={handleReshootTrigger}
              onDismantle={handleDismantle}
              onTranslate={handleTranslateCard}
              onGenerateAltText={handleGenerateAltText}
              isReshooting={reshootingCards.has(modalCardId)}
              config={config}
            />
          </div>
          <button
            onClick={() => setModalCardId(null)}
            className="absolute top-4 right-4 z-50 text-white/50 hover:text-white bg-black/80 w-10 h-10 rounded-full flex items-center justify-center border border-white/20 transition-colors hidden sm:flex"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
          <button
            onClick={() => setModalCardId(null)}
            className="fixed top-2 right-2 sm:hidden z-50 text-white bg-red-900 w-10 h-10 rounded-full flex items-center justify-center border border-red-500 shadow-lg"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>
      )}

      <ReshootDialog
        isOpen={!!reshootTarget}
        onClose={() => setReshootTarget(null)}
        onConfirm={handleReshootConfirm}
        cardName={reshootTarget?.name || ""}
      />

      <InstructionModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />

      <div className="fixed bottom-4 left-4 z-40 pointer-events-none sm:hidden">
        <ApiMonitor isProcessing={isProcessing} />
      </div>

      <div id="tactical-command-portal" className="fixed inset-0 pointer-events-none z-[150]"></div>

      {/* SELECTOR MODAL (HUD Style) */}
      {selectorTarget && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-6 lg:p-12"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectorTarget(null); }}
        >
          <div className="absolute inset-0 bg-cinematic-950/90 backdrop-blur-2xl pointer-events-none"></div>
          <div className="relative z-10 w-full max-w-[1200px] h-[90vh] bg-cinematic-900/60 border border-cinematic-cyan/20 rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col shadow-[inset_0_0_100px_rgba(0,0,0,0.8),0_0_50px_rgba(0,243,255,0.1)] ring-1 ring-white/5 animate-slide-up backdrop-blur-sm">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 pb-2 sm:pb-4 border-b border-white/5 shrink-0 relative">
              <div className="absolute left-0 bottom-0 w-32 h-[1px] bg-gradient-to-r from-cinematic-cyan to-transparent"></div>
              
              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] text-zinc-500 font-mono tracking-[0.3em] uppercase mb-1">Target Selection</span>
                <h3 className="text-lg sm:text-2xl lg:text-3xl font-serif text-white tracking-widest uppercase flex items-center gap-2 sm:gap-3">
                  {selectorTarget.startsWith("fusion") ? "Genetic Repository" : "Unit Deployment"}
                  {selectorTarget.startsWith("fusion") && (
                    <span className="text-[8px] sm:text-[10px] text-red-400 font-mono px-2 py-0.5 bg-red-950/50 rounded border border-red-900/50 flex align-middle">
                      <i className="fa-solid fa-lock mr-1 mt-0.5"></i> UR LOCKED
                    </span>
                  )}
                </h3>
              </div>
              
              <button
                onClick={() => setSelectorTarget(null)}
                className="absolute top-0 right-0 sm:relative sm:top-auto sm:right-auto w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-cinematic-cyan/20 text-zinc-400 hover:text-cinematic-cyan border border-white/5 hover:border-cinematic-cyan/30 transition-all font-mono text-xs sm:text-sm"
              >
                ESC
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-6 px-1 lg:px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5 content-start">
                {cards.map((c) => {
                  const isFusion = selectorTarget.startsWith("fusion");
                  const isUR = c.cardClass === "UR";
                  const locked = isFusion && isUR;
                  const selected = isFusion
                    ? fusionSlot1?.id === c.id || fusionSlot2?.id === c.id
                    : squad.some((sq) => sq?.id === c.id);
                  const reshooting = reshootingCards.has(c.id);

                  return (
                    <div
                      key={c.id}
                      className={`relative transform transition-all duration-300 hover:-translate-y-1 ${
                        locked ? "opacity-30 grayscale cursor-not-allowed" : "cursor-pointer"
                      }`}
                      onClick={() => !locked && handleSelectCard(c.id)}
                    >
                      <div className={`rounded-xl transition-all ${
                        selected ? 'ring-2 ring-cinematic-cyan shadow-[0_0_30px_rgba(0,243,255,0.3)] scale-[1.02]' 
                        : 'hover:ring-1 hover:ring-white/20'
                      }`}>
                         <MiniCard 
                           card={c} 
                           context={isFusion ? "fusion-selector" : "squad-selector"}
                           locked={locked}
                           selected={selected}
                           reshooting={reshooting}
                           onClickAction={() => {}} 
                         />
                      </div>
                      
                      {selected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-cinematic-cyan text-black rounded-lg flex items-center justify-center shadow-[0_0_15px_var(--color-cinematic-cyan)] z-30 font-bold border-2 border-black">
                          <i className="fa-solid fa-check text-[10px] sm:text-base"></i>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 pt-4 border-t border-white/5 mt-auto flex justify-center">
              <button
                onClick={() => setSelectorTarget(null)}
                className="px-6 sm:px-8 bg-black/50 hover:bg-cinematic-cyan/10 border border-white/5 hover:border-cinematic-cyan/30 text-white py-2.5 sm:py-3 rounded-full text-[10px] sm:text-xs font-mono tracking-[0.2em] uppercase transition-all shadow-lg hover:shadow-[0_0_20px_rgba(0,243,255,0.2)]"
              >
                Abort Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIG SUB-MODAL */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-[95] flex items-center justify-center p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
        >
          <div className="absolute inset-0 bg-cinematic-950/80 backdrop-blur-xl pointer-events-none"></div>
          <div className="relative z-10 w-full max-w-xl max-h-[85vh] overflow-y-auto no-scrollbar bg-black border border-white/10 rounded-2xl p-6 sm:p-8 shadow-[0_50px_100px_rgba(0,0,0,1)] ring-1 ring-white/5 animate-pop-in space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-serif text-white tracking-widest flex items-center gap-3">
                <i className="fa-solid fa-microchip text-cinematic-cyan"></i> 
                SYSTEM CORE
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-[9px] sm:text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Visual Protocol</label>
                <select
                  value={tempConfig.artStyle}
                  onChange={(e) => setTempConfig({ ...tempConfig, artStyle: e.target.value })}
                  className="w-full bg-white/5 text-white rounded-lg py-2.5 px-3 sm:py-3 sm:px-4 border border-white/10 focus:border-cinematic-cyan/50 outline-none text-xs sm:text-sm font-mono transition-all appearance-none cursor-pointer"
                >
                  <option value="realistic" className="bg-zinc-900 text-white">Simulation (Photoreal)</option>
                  <option value="stylized" className="bg-zinc-900 text-white">Hyper-Stylized (2.5D)</option>
                  <option value="cinematic" className="bg-zinc-900 text-white">Cinematic Editorial</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] sm:text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Language Module</label>
                <select
                  value={tempConfig.language || "vi"}
                  onChange={(e) => setTempConfig({ ...tempConfig, language: e.target.value as "vi" | "en" })}
                  className="w-full bg-white/5 text-white rounded-lg py-2.5 px-3 sm:py-3 sm:px-4 border border-white/10 focus:border-cinematic-cyan/50 outline-none text-xs sm:text-sm font-mono transition-all appearance-none cursor-pointer"
                >
                  <option value="vi" className="bg-zinc-900 text-white">Tiếng Việt (VI)</option>
                  <option value="en" className="bg-zinc-900 text-white">English (EN)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5 rounded-xl bg-zinc-900/50 border border-white/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 bg-white/5 text-zinc-400 px-3 py-1 font-mono text-[8px] sm:text-[9px] uppercase tracking-widest rounded-bl-lg">Central Processing</div>
               
               <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white font-mono uppercase tracking-wider">Gemini Protocol</span>
                    <span className="text-[8px] text-zinc-500 font-mono">Use custom API key for logic & vision</span>
                  </div>
                  <button 
                    onClick={() => setTempConfig({ ...tempConfig, useCustomGemini: !tempConfig.useCustomGemini })}
                    className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${tempConfig.useCustomGemini ? 'bg-cinematic-gold' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${tempConfig.useCustomGemini ? 'left-6' : 'left-1'}`}></div>
                  </button>
               </div>

               {tempConfig.useCustomGemini && (
                 <div className="space-y-4 pt-2 animate-fade-in">
                    <div className="space-y-2">
                       <label className="text-[9px] sm:text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Gemini Protocol Key</label>
                       <input
                         type="password"
                         value={tempConfig.geminiKey}
                         onChange={(e) => setTempConfig({ ...tempConfig, geminiKey: e.target.value })}
                         className="w-full bg-black text-cinematic-gold rounded-lg py-2.5 px-3 sm:py-3 sm:px-4 border border-white/10 focus:border-cinematic-gold/50 outline-none text-xs sm:text-sm font-mono placeholder-zinc-700"
                         placeholder="Enter Gemini API Key..."
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] sm:text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Core Model ID</label>
                       <select
                         value={tempConfig.geminiModel}
                         onChange={(e) => setTempConfig({ ...tempConfig, geminiModel: e.target.value })}
                         className="w-full bg-black text-white rounded-lg py-2.5 px-3 sm:py-3 sm:px-4 border border-white/10 focus:border-cinematic-gold/50 outline-none text-xs sm:text-sm font-mono appearance-none cursor-pointer"
                       >
                         <option value="gemini-3.1-flash-lite-preview" className="bg-zinc-900 text-white">Gemini 3.1 Flash Lite (Fastest)</option>
                         <option value="gemini-3-flash-preview" className="bg-zinc-900 text-white">Gemini 3 Flash (Recommended)</option>
                         <option value="gemini-2.5-flash" className="bg-zinc-900 text-white">Gemini 2.5 Flash (Legacy)</option>
                       </select>
                    </div>
                 </div>
               )}
            </div>

            <div className="space-y-4 p-4 sm:p-5 rounded-xl bg-zinc-900/50 border border-white/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 bg-white/5 text-zinc-400 px-3 py-1 font-mono text-[8px] sm:text-[9px] uppercase tracking-widest rounded-bl-lg">Optics API</div>
               <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Pollinations By-pass Key</label>
                  <input
                    type="password"
                    value={tempConfig.pollinationsKey}
                    onChange={(e) => setTempConfig({ ...tempConfig, pollinationsKey: e.target.value })}
                    className="w-full bg-black text-cinematic-cyan rounded-lg py-2.5 px-3 sm:py-3 sm:px-4 border border-white/10 focus:border-cinematic-cyan/50 outline-none text-xs sm:text-sm font-mono placeholder-zinc-700"
                    placeholder="sk_..."
                  />
                  <p className="text-[8px] sm:text-[9px] text-zinc-500 font-mono">Leave blank to use base protocol.</p>
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Optics Model ID</label>
                  <select
                    value={tempConfig.defaultImageModel}
                    onChange={(e) => setTempConfig({ ...tempConfig, defaultImageModel: e.target.value })}
                    className="w-full bg-black text-white rounded-lg py-2.5 px-3 sm:py-3 sm:px-4 border border-white/10 focus:border-cinematic-cyan/50 outline-none text-xs sm:text-sm font-mono appearance-none cursor-pointer"
                  >
                    {IMAGE_MODELS.map(m => (
                      <option key={m.id} value={m.id} className="bg-zinc-900 text-white">{m.name}</option>
                    ))}
                  </select>
               </div>
            </div>

            <div className="flex justify-end gap-2 sm:gap-3 pt-4 border-t border-white/5">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveConfig(tempConfig);
                  setShowSettings(false);
                  setToast({ msg: "Core updated.", type: "success" });
                }}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-mono uppercase tracking-widest bg-white text-black hover:bg-cinematic-cyan hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-all font-bold"
              >
                Apply Changes
              </button>
            </div>
            
            <div className="pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-red-900/30">
               <button
                 onClick={() => { setShowSettings(false); handleResetGame(); }}
                 className="w-full py-2.5 sm:py-3 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 transition-all font-mono text-[10px] sm:text-xs tracking-widest uppercase group flex items-center justify-center gap-2"
               >
                 <i className="fa-solid fa-triangle-exclamation group-hover:animate-pulse"></i> Factory Reset
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
