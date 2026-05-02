import React, { useState, useEffect } from "react";
import { useGameState } from "./hooks/useGameState";
import { ExtractView } from "./views/ExtractView";
import { FusionView } from "./views/FusionView";
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

type Tab = "extract" | "fusion" | "combat" | "missions" | "blackmarket";

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
    boss,
    setBoss,
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
    "squad1" | "squad2" | "squad3" | "fusion1" | "fusion2" | null
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
    type: "error" | "success";
  } | null>(null);

  // Settings form state
  const [tempConfig, setTempConfig] = useState(config);
  const [reshootingCards, setReshootingCards] = useState<Set<string>>(
    new Set(),
  );
  const [reshootTarget, setReshootTarget] = useState<Card | null>(null);

  useEffect(() => {
    const interval = setInterval(
      () => setDbStatus(dbService.getStatus()),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTempConfig(config);
  }, [config, showSettings]);

  useEffect(() => {
    const handleApiMsg = (e: any) => {
      setToast({ msg: e.detail || "", type: "info" });
      setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener("api_status_message", handleApiMsg);
    return () => window.removeEventListener("api_status_message", handleApiMsg);
  }, []);

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
    old1Id: string,
    old2Id: string,
  ) => {
    await removeCard(old1Id);
    await removeCard(old2Id);
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
        if (!modifyCurrency(-50)) return;

        setReshootingCards((prev) => new Set(prev).add(card.id));

        try {
          const newImgUrl = await generateImageFromAi(card, config, modelId);
          const cardToUpdate = { ...card };
          if (newImgUrl.startsWith("data:image")) {
            cardToUpdate.imageUrl = newImgUrl;
            delete cardToUpdate.imageBlob;
          } else {
            cardToUpdate.imageUrl = newImgUrl;
          }
          await updateCard(cardToUpdate);
          handleAlert("Photoshoot hoàn tất", "Trang bìa mới đã được cập nhật.");
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
    // Get dismantle value roughly
    const getVal = (cls: string) =>
      [50, 100, 200, 400, 800][["N", "R", "SR", "SSR", "UR"].indexOf(cls)] ||
      50;
    const v = getVal(c.cardClass);

    handleConfirm(
      `Phân giải <strong>${c.name}</strong>?<br>Nhận: <span class="text-green-400 font-bold">+${v} DC</span>`,
      async () => {
        await removeCard(cardId);
        modifyCurrency(v);
        setToast({ msg: `Thu hồi +${v} DC.`, type: "success" });
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
    <div className="min-h-screen overflow-x-hidden flex flex-col font-sans selection:bg-cinematic-gold selection:text-black relative">
      <div className="fixed inset-0 z-40 noise-overlay pointer-events-none"></div>
      <div
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
        id="bgAmbient"
      >
        <div
          className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] opacity-30 transform scale-150 transition-colors duration-1000 ${activeTab === "combat" ? "bg-red-900/20" : "bg-cinematic-gold/10"}`}
        ></div>
        <div
          className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-30 transform scale-125 transition-colors duration-1000 ${activeTab === "combat" ? "bg-orange-900/20" : "bg-blue-900/20"}`}
        ></div>
      </div>

      {/* Top Bar Compact */}
      <div className="relative z-10 w-full bg-black/60 border-b border-white/5 py-1.5 px-4 flex justify-between items-center text-[10px] text-cinematic-muted backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <i
              className={`fa-solid fa-hard-drive mr-1.5 ${dbStatus === "online" ? "text-green-500" : "text-red-500"}`}
            ></i>
            <span className="hidden sm:inline">VAULT:</span>{" "}
            <span
              className={
                dbStatus === "online" ? "text-green-400" : "text-red-400"
              }
            >
              {dbStatus === "online" ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="text-cinematic-cyan hover:text-white transition-colors flex items-center gap-1 border border-cinematic-cyan/20 px-1.5 py-0.5 rounded bg-cinematic-900/30 font-mono"
            title="Cấu hình hệ thống (System Settings)"
          >
            <i className="fa-solid fa-sliders text-[9px]"></i> OVERRIDE
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInstructions(true)}
            className="text-zinc-500 hover:text-cinematic-gold transition-colors flex items-center gap-1 border border-white/5 px-2 py-0.5 rounded bg-zinc-900/50 font-mono"
            title="Hướng dẫn chơi (Manual)"
          >
            <i className="fa-solid fa-circle-question text-[9px]"></i>{" "}
            <span className="hidden sm:inline">MANUAL</span>
          </button>
          <div
            className="flex items-center gap-2 bg-zinc-900 px-3 py-0.5 rounded border border-white/10 shadow-lg"
            title="Inventory"
          >
            <div className="flex items-center gap-1">
              <i className="fa-solid fa-ticket text-cinematic-cyan opacity-80"></i>{" "}
              <span className="font-bold text-white tabular-nums">
                {inventory.baseTickets}
              </span>
            </div>
            <div className="w-[1px] h-3 bg-white/20"></div>
            <div className="flex items-center gap-1">
              <i className="fa-solid fa-ticket text-purple-400 opacity-80"></i>{" "}
              <span className="font-bold text-white tabular-nums">
                {inventory.eliteTickets}
              </span>
            </div>
            <div className="w-[1px] h-3 bg-white/20"></div>
            <div className="flex items-center gap-1">
              <i className="fa-brands fa-galactic-senate text-amber-500 opacity-80"></i>{" "}
              <span className="font-bold text-amber-400 tabular-nums">
                {inventory.quantumDust}
              </span>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 bg-zinc-900 px-2 py-0.5 rounded border border-cinematic-gold/20 shadow-lg"
            title="Data Credits (DC): Tài nguyên giao dịch"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-cinematic-gold animate-pulse"></div>
            <span className="font-bold text-white tabular-nums">
              {currency}
            </span>
            <span className="text-[9px] text-cinematic-gold opacity-70">
              DC
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 bg-zinc-900 px-2 py-0.5 rounded border border-cinematic-cyan/20 shadow-lg"
            title={`Kinh nghiệm (EXP): ${experience % 1000}/1000`}
          >
            <span className="text-cinematic-cyan font-bold">LV.{level}</span>
            <div className="w-8 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-cinematic-cyan"
                style={{ width: `${(experience % 1000) / 10}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Compact */}
      <main className="relative z-10 flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between mb-4 border-b border-white/5 pb-2">
          <div className="mb-2 sm:mb-0">
            <h1 className="font-serif text-2xl text-white tracking-tighter uppercase leading-none">
              MUSE ARCHIVES
            </h1>
            <div className="text-[9px] text-zinc-500 font-mono tracking-widest mt-1 opacity-60">
              SYSTEM_OPS: {activeTab.toUpperCase()}_PROTOCOL
            </div>
          </div>

          <div className="flex p-0.5 bg-zinc-900 rounded-lg border border-white/5 shadow-2xl">
            {[
              { id: "extract", icon: "fa-microscope", label: "CORE" },
              { id: "fusion", icon: "fa-dna", label: "FORGE" },
              { id: "combat", icon: "fa-crosshairs", label: "OPS" },
              { id: "missions", icon: "fa-satellite-dish", label: "UNITS" },
              { id: "blackmarket", icon: "fa-shop", label: "MARKET" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => !isProcessing && setActiveTab(btn.id as Tab)}
                className={`px-3 py-1.5 rounded-md text-[9px] font-mono font-bold tracking-widest transition-all flex items-center gap-1.5 ${activeTab === btn.id ? "bg-white/10 text-white shadow-inner border border-white/10" : "text-zinc-600 hover:text-zinc-400"}`}
              >
                <i
                  className={`fa-solid ${btn.icon} ${activeTab === btn.id ? "text-cinematic-cyan" : ""}`}
                ></i>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

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
        {activeTab === "fusion" && (
          <FusionView
            config={config}
            currency={currency}
            modifyCurrency={modifyCurrency}
            inventory={inventory}
            modifyInventory={modifyInventory}
            fusionSlot1={fusionSlot1}
            fusionSlot2={fusionSlot2}
            setFusionSlot1={setFusionSlot1}
            setFusionSlot2={setFusionSlot2}
            onOpenSelector={(s) => setSelectorTarget(`fusion${s}`)}
            onCompleteFusion={handleCompleteFusion}
            onError={(m) => setToast({ msg: m, type: "error" })}
            onAlert={handleAlert}
            isGlobalProcessing={isProcessing}
            setGlobalProcessing={setIsProcessing}
          />
        )}
        {activeTab === "combat" && (
          <CombatView
            level={level}
            config={config}
            currency={currency}
            modifyCurrency={modifyCurrency}
            modifyInventory={modifyInventory}
            gainExperience={gainExperience}
            squad={squad}
            leaderId={leaderId}
            setLeaderId={setLeaderId}
            setBoss={setBoss}
            boss={boss}
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

        <GalleryView cards={cards} onOpenCard={setModalCardId} />
      </main>

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
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
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

      <div className="fixed bottom-4 left-4 z-40 pointer-events-none">
        <ApiMonitor isProcessing={isProcessing} />
      </div>

      {/* SELECTOR MODAL */}
      {selectorTarget && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/95 backdrop-blur-[10px]"
            onClick={() => setSelectorTarget(null)}
          ></div>
          <div className="relative z-10 w-full max-w-[800px] h-[80vh] sm:h-[85vh] bg-zinc-950 border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 shrink-0">
              <h3 className="text-lg sm:text-xl font-serif text-white flex items-center">
                {selectorTarget.startsWith("fusion") ? (
                  <>
                    Kho Nguyên Liệu DNA{" "}
                    <span className="text-[10px] sm:text-xs text-red-400 font-sans ml-3 px-2 py-1 bg-red-500/10 rounded-md border border-red-500/20">
                      <i className="fa-solid fa-lock mr-1"></i> Khóa thẻ UR
                    </span>
                  </>
                ) : (
                  <>
                    Triển Khai Đội Hình{" "}
                    <span className="text-[10px] sm:text-xs text-green-400 font-sans ml-3 px-2 py-1 bg-green-500/10 rounded-md border border-green-500/20">
                      <i className="fa-solid fa-shield-halved mr-1"></i> Lắp
                      ghép tự do
                    </span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setSelectorTarget(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 content-start pb-4">
              {cards.map((c) => {
                const isFusion = selectorTarget.startsWith("fusion");
                const isUR = c.cardClass === "UR";
                const locked = isFusion && isUR;
                const selected = isFusion
                  ? fusionSlot1?.id === c.id || fusionSlot2?.id === c.id
                  : squad.some((sq) => sq?.id === c.id);
                const reshooting = reshootingCards.has(c.id);

                return (
                  <MiniCard
                    key={c.id}
                    card={c}
                    context={isFusion ? "fusion-selector" : "squad-selector"}
                    locked={locked}
                    selected={selected}
                    reshooting={reshooting}
                    onClickAction={() => handleSelectCard(c.id)}
                  />
                );
              })}
            </div>

            <div className="shrink-0 pt-4 border-t border-white/10 mt-auto">
              <button
                onClick={() => setSelectorTarget(null)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 py-3.5 rounded-xl text-[10px] sm:text-xs font-mono tracking-widest uppercase transition-colors shadow-lg"
              >
                Hủy & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowSettings(false)}
          ></div>
          <div className="relative z-10 w-full max-w-xl bg-cinematic-900 border border-cinematic-cyan/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,243,255,0.15)] animate-pop-in overflow-y-auto max-h-[90vh] no-scrollbar">
            <h3 className="text-xl font-serif text-cinematic-cyan mb-2 border-b border-white/10 pb-3 flex items-center">
              <i className="fa-solid fa-terminal mr-2"></i> System Configuration
            </h3>
            <p className="text-[10px] text-cinematic-muted mb-4 tracking-wider">
              Tùy chỉnh cấu hình sinh AI và API vệ tinh cục bộ. Tự động mã hóa
              an toàn ở Client.
            </p>

            <div className="mb-5 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-[10px] text-cinematic-gold uppercase tracking-widest mb-1">
                  <i className="fa-solid fa-palette mr-1"></i> Art Style
                </label>
                <select
                  value={tempConfig.artStyle}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, artStyle: e.target.value })
                  }
                  className="w-full bg-black/60 text-white rounded-lg py-2.5 px-3 outline-none border border-white/10 focus:border-cinematic-cyan/50 text-sm appearance-none"
                >
                  <option value="realistic">Realistic / Photorealistic</option>
                  <option value="stylized">Stylized Illustration (2.5D)</option>
                  <option value="cinematic">
                    Cinematic / Fashion Editorial
                  </option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-cinematic-gold uppercase tracking-widest mb-1">
                  <i className="fa-solid fa-language mr-1"></i> Ngôn ngữ Thẻ /
                  Engine
                </label>
                <select
                  value={tempConfig.language || "vi"}
                  onChange={(e) =>
                    setTempConfig({
                      ...tempConfig,
                      language: e.target.value as "vi" | "en",
                    })
                  }
                  className="w-full bg-black/60 text-white rounded-lg py-2.5 px-3 outline-none border border-white/10 focus:border-cinematic-cyan/50 text-sm appearance-none"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English (Tiếng Anh)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 mb-5 border border-cinematic-cyan/20 rounded-lg p-4 bg-cinematic-900/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-cinematic-cyan text-black px-3 py-1 font-bold text-[10px] uppercase rounded-bl-lg">
                Core GenAI Engine
              </div>
              <p className="text-[10px] text-cinematic-muted mb-2 pt-2">
                Pollinations.ai mặc định được sử dụng cho hình ảnh và text với
                Proxy của Game. Nhập sk_key riêng là tùy chọn (nếu có).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-cinematic-cyan uppercase tracking-widest mb-1">
                    Pollinations Key (Proxy)
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-key absolute left-3 top-1/2 transform -translate-y-1/2 text-white/30"></i>
                    <input
                      type="password"
                      value={tempConfig.pollinationsKey}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          pollinationsKey: e.target.value,
                        })
                      }
                      className="w-full bg-black/60 text-white rounded-lg py-2.5 pl-10 pr-3 outline-none border border-white/10 focus:border-cinematic-cyan/50 text-sm font-mono"
                      placeholder="sk-..."
                    />
                  </div>
                  <p className="text-[9px] text-cinematic-muted mt-1 italic">
                    Để trống để dùng API mặc định của Game. Nhập riêng nếu bạn
                    có.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] text-cinematic-cyan uppercase tracking-widest mb-1">
                    Default Image Model (Pollinations)
                  </label>
                  <select
                    value={tempConfig.defaultImageModel}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        defaultImageModel: e.target.value,
                      })
                    }
                    className="w-full bg-black/60 text-white rounded-lg py-2.5 px-3 outline-none border border-white/10 focus:border-cinematic-cyan/50 text-sm appearance-none"
                  >
                    {IMAGE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-2 border border-white/10 rounded-lg p-4 bg-black/40">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                <div>
                  <h4 className="text-sm text-cinematic-gold font-bold">
                    Google Gemini (Dự phòng text)
                  </h4>
                  <p className="text-[9px] text-cinematic-muted">
                    Bật để ưu tiên dùng Gemini API tạo text. Tự động fallback về
                    Pollinations khi hết Limit.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mr-2 shrink-0">
                  <input
                    type="checkbox"
                    checked={tempConfig.useCustomGemini}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        useCustomGemini: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cinematic-gold"></div>
                </label>
              </div>

              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300 ${tempConfig.useCustomGemini ? "opacity-100" : "opacity-30 pointer-events-none"}`}
              >
                <div>
                  <label className="block text-[10px] text-cinematic-gold uppercase tracking-widest mb-1">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-key absolute left-3 top-1/2 transform -translate-y-1/2 text-white/30"></i>
                    <input
                      type="password"
                      value={tempConfig.geminiKey}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          geminiKey: e.target.value,
                        })
                      }
                      className="w-full bg-black/60 text-white rounded-lg py-2.5 pl-10 pr-3 outline-none border border-white/10 focus:border-cinematic-cyan/50 text-sm font-mono"
                      placeholder="AIzaSy..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-cinematic-gold uppercase tracking-widest mb-1">
                    Gemini Model
                  </label>
                  <select
                    value={tempConfig.geminiModel}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        geminiModel: e.target.value,
                      })
                    }
                    className="w-full bg-black/60 text-white rounded-lg py-2.5 px-3 outline-none border border-white/10 focus:border-cinematic-cyan/50 text-sm appearance-none"
                  >
                    <option value="gemini-3.1-flash-lite-preview">
                      Gemini 3.1 Flash Lite
                    </option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-red-900/40 pt-4">
              <button
                onClick={() => {
                  setShowSettings(false);
                  handleResetGame();
                }}
                className="flex items-center text-xs text-red-500 bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 px-3 py-2 rounded transition-colors"
              >
                <i className="fa-solid fa-triangle-exclamation mr-2"></i> Format
                Disk (Reset Game)
              </button>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    saveConfig(tempConfig);
                    setShowSettings(false);
                    handleAlert(
                      "Hệ Thống Cine-Tech",
                      `Đã lưu cấu hình Cốt lõi.<br>Trạng thái Gemini: <strong class="${tempConfig.useCustomGemini ? "text-green-400" : "text-red-400"}">${tempConfig.useCustomGemini ? "BẬT" : "TẮT"}</strong>`,
                    );
                  }}
                  className="bg-cinematic-cyan text-black px-6 py-2 rounded-lg font-bold shadow-[0_0_15px_rgba(0,243,255,0.4)] hover:bg-white transition-colors"
                >
                  Lưu Thiết Lập
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
