import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Camera,
  Mic,
  MicOff,
  Plus,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { GroceryItem, SmartActionDraft, StoreOption } from "../types";
import { detectCategory } from "../utils/smartItemParser";
import { useLanguage } from "../context/LanguageContext";
import { canonicalizeItemName } from "../utils/itemLocalization";

interface AddItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantryItems: GroceryItem[];
  shoppingListItems: GroceryItem[];
  defaultStore: string;
  onSmartActionsParsed: (
    actions: SmartActionDraft[],
    receiptMeta?: {
      storeName: string;
      totalAmount: number;
      currency: string;
      purchaseDate?: string;
    }
  ) => void;
}

export const AddItemsModal: React.FC<AddItemsModalProps> = ({
  isOpen,
  onClose,
  pantryItems,
  shoppingListItems,
  defaultStore,
  onSmartActionsParsed,
}) => {
  const { languageInfo, t } = useLanguage();
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  // Quick sample voice phrases to test voice interpretation even without mic hardware
  const sampleVoicePhrases = useMemo(() => {
    switch (languageInfo.code) {
      case "pt":
        return [
          "Maçãs e pão no Aldi, e café e leite no Lidl",
          "Preciso de comprar bacon, ovos e leite",
          "Comprei 3 maçãs e café no Lidl",
          "Afinal já não preciso de leite",
          "Acabou o arroz e manteiga",
        ];
      case "es":
        return [
          "Necesito comprar bacon, huevos y leche",
          "Compré 3 manzanas y café en Lidl",
          "Se terminó el arroz y la mantequilla",
        ];
      case "fr":
        return [
          "Acheter du bacon, des oeufs et du lait",
          "J'ai acheté 3 pommes et du café chez Lidl",
          "Plus de riz ni de beurre",
        ];
      case "de":
        return [
          "Ich brauche Speck, Eier und Milch",
          "Ich habe 3 Äpfel und Kaffee bei Lidl gekauft",
          "Reis und Butter sind leer",
        ];
      case "it":
        return [
          "Devo comprare pancetta, uova e latte",
          "Ho comprato 3 mele e caffè al Lidl",
          "Abbiamo finito il riso e il burro",
        ];
      default:
        return [
          "Apples and bread from Aldi, and coffee and milk from Lidl",
          "I need bacon, eggs and whole milk",
          "Bought 3 apples and coffee from Lidl",
          "Actually I don't need milk",
          "We ran out of butter and rice",
        ];
    }
  }, [languageInfo.code]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Clean up timer, speech recognition, and media recorder on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (_) {}
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  // Real Audio Recording - captures raw microphone audio directly for Gemini Transcribe,
  // while keeping a client-side safety net so API rate limits never block the user
  const startAudioRecording = async () => {
    setErrorMessage(null);
    setSpeechTranscript("");
    liveTranscriptRef.current = "";
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(
        "Microphone not supported on this browser. You can type or use the test phrases below."
      );
      return;
    }

    try {
      // Start browser speech recognition quietly in the background as a safety net against rate limits
      const SpeechRec =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRec) {
        try {
          const recognition = new SpeechRec();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang =
            languageInfo.code === "pt"
              ? "pt-PT"
              : languageInfo.code === "es"
              ? "es-ES"
              : languageInfo.code === "fr"
              ? "fr-FR"
              : languageInfo.code === "de"
              ? "de-DE"
              : languageInfo.code === "it"
              ? "it-IT"
              : "en-US";

          recognition.onresult = (event: any) => {
            let fullText = "";
            for (let i = 0; i < event.results.length; ++i) {
              fullText += event.results[i][0].transcript + " ";
            }
            const clean = fullText.trim();
            if (clean) {
              liveTranscriptRef.current = clean;
            }
          };

          recognition.onerror = () => {};
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (_) {}
      }

      // Capture clear, normalized voice audio so Gemini receives loud, clear speech
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (specErr: any) {
        if (specErr.name === "NotAllowedError" || specErr.name === "PermissionDeniedError") {
          throw specErr;
        }
        // Fallback to basic audio: true if detailed constraint object is unsupported
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Determine best supported audio format
      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Wait for all pending dataavailable events to flush completely
        await new Promise((r) => setTimeout(r, 250));

        // Stop all tracks on the stream to release mic indicator
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });

        if (audioBlob.size < 500 && (!liveTranscriptRef.current || !liveTranscriptRef.current.trim())) {
          setIsRecording(false);
          setErrorMessage("Recording was too short. Please speak your groceries, then tap the mic to stop.");
          return;
        }

        // Send recorded audio directly to Gemini Transcribe
        await handleAudioTranscribeAndInterpret(audioBlob, mimeType);
      };

      // Start recording with 200ms timeslice to ensure continuous data capture
      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access notice:", err?.name, err?.message);
      setIsRecording(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicPermissionDenied(true);
        setErrorMessage(
          "Microphone permission was denied. Click the lock/settings icon in your browser URL bar to allow mic access, or click any sample phrase below."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage(
          "No microphone found on your device. You can type or use the sample phrases below."
        );
      } else {
        setErrorMessage(
          "Could not open microphone. Please check permissions or use the sample phrases below."
        );
      }
    }
  };

  const stopAudioRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsRecording(false);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      try {
        mediaRecorderRef.current.requestData();
      } catch (_) {}
      mediaRecorderRef.current.stop();
    }
  };

  // Convert audio blob to base64, call Gemini Transcribe, with seamless local safety net if rate limited
  const handleAudioTranscribeAndInterpret = async (
    audioBlob: Blob,
    mimeType: string
  ) => {
    setIsLoading(true);
    setLoadingMessage("Transcribing audio with Gemini...");
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const audioBase64 = await base64Promise;

      const transcribeRes = await fetch("/api/ai/transcribe-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          language: languageInfo.code,
          languageName: languageInfo.nativeName,
        }),
      });

      const transcribeData = await transcribeRes.json().catch(() => ({}));

      // If Gemini succeeded, use its transcription
      if (transcribeRes.ok && transcribeData.transcript?.trim()) {
        const transcript = transcribeData.transcript.trim();
        setSpeechTranscript(transcript);
        setTextInput(transcript);
        await interpretPromptWithAI(transcript);
        return;
      }

      // If Gemini hit a 429 quota or rate limit, check if we have the parallel speech transcript!
      if (liveTranscriptRef.current && liveTranscriptRef.current.trim().length > 0) {
        const fallbackText = liveTranscriptRef.current.trim();
        setSpeechTranscript(fallbackText);
        setTextInput(fallbackText);
        await interpretPromptWithAI(fallbackText);
        return;
      }

      if (!transcribeRes.ok) {
        throw new Error(transcribeData.error || "Failed to transcribe audio");
      }

      if (transcribeData.noSpeech || !transcribeData.transcript?.trim()) {
        setIsLoading(false);
        setErrorMessage(
          transcribeData.message ||
            "No speech detected in audio. Please tap mic and speak clearly into your microphone."
        );
        return;
      }
    } catch (err: any) {
      console.warn("Transcribe error:", err);
      // Final check: if parallel safety net caught the speech, proceed anyway!
      if (liveTranscriptRef.current && liveTranscriptRef.current.trim().length > 0) {
        const fallbackText = liveTranscriptRef.current.trim();
        setSpeechTranscript(fallbackText);
        setTextInput(fallbackText);
        await interpretPromptWithAI(fallbackText);
        return;
      }

      setIsLoading(false);
      setErrorMessage(
        err.message ||
          "Could not transcribe audio. Please speak clearly into your microphone."
      );
    }
  };

  // Deep Contextual AI Interpretation (Add, Move pantry to store, Move store to pantry, Remove)
  const interpretPromptWithAI = async (promptText: string) => {
    if (!promptText.trim()) return;

    setIsLoading(true);
    setLoadingMessage("Interpreting grocery intent against pantry inventory...");

    try {
      const response = await fetch("/api/ai/smart-interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: promptText,
          pantryItems,
          shoppingListItems,
          defaultStore,
          language: languageInfo.code,
          languageName: languageInfo.nativeName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.actions && Array.isArray(data.actions)) {
          if (data.actions.length > 0) {
            const drafts: SmartActionDraft[] = data.actions.map(
              (act: any, idx: number) => {
                // Trust the AI's translation, canonical naming, and category classification directly
                const itemName = act.name?.trim() || "Item";
                const itemCategory = act.category || "Pantry";
                const itemStore = act.store?.trim() || data.detectedStore || defaultStore;
                const itemPrice = typeof act.price === "number" && act.price > 0 ? Number(act.price.toFixed(2)) : 0;
                return {
                  id: `action-${Date.now()}-${idx}`,
                  actionType: act.actionType || "add_to_store",
                  name: itemName,
                  category: itemCategory,
                  quantity: act.quantity || 1,
                  unit: act.unit || "pcs",
                  store: itemStore,
                  price: itemPrice,
                  selected: true,
                  notes: act.notes || "",
                  imageUrl: act.imageUrl || "",
                  reasoning: act.reasoning || "",
                  existingItemId: act.existingItemId,
                  existingItemLocation: act.existingItemLocation,
                  existingPantryQty: act.existingPantryQty,
                };
              }
            );

            setIsLoading(false);
            setTextInput("");
            onSmartActionsParsed(drafts);
            return;
          } else {
            // AI confirmed 0 actions needed (e.g. user said "don't buy X" and X is not in pantry or shopping list)
            setIsLoading(false);
            setTextInput("");
            setErrorMessage(
              data.summary ||
                (languageInfo.code === "pt"
                  ? "O item mencionado não se encontra na lista de compras nem na despensa, pelo que nada foi alterado."
                  : "The mentioned item is not on your shopping list or pantry, so nothing was changed.")
            );
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Smart interpret error:", err);
    }

    // Client fallback if network offline
    fallbackClientInterpret(promptText);
  };

  // Simple client fallback for offline resilience
  const fallbackClientInterpret = (text: string) => {
    const segments = text
      .replace(/^(oh|hey|please|can you|i want to|we need to)\s+/i, "")
      .split(/(?:,|\band\b|\be\b|\balso\b|\bthen\b|\.|\n)+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const drafts: SmartActionDraft[] = segments.map((seg, idx) => {
      const lowerSeg = seg.toLowerCase();
      const isRemoval = lowerSeg.match(
        /\b(don't need|dont need|no need|actually don't need|don't want|dont want|don't buy|dont buy|remove|delete|finish|finished|cancel|forget|não preciso|nao preciso|não quero|apagar|remover|cancela)\b/i
      );

      // Detect explicit price if mentioned in speech/text (e.g. "a 2.50€", "for 3 euros")
      let segPrice = 0;
      const priceMatch =
        seg.match(/(?:for|a|por|custou|custa|at)\s*(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros|\$)?/i) ||
        seg.match(/(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros)\b/i);
      if (priceMatch) {
        segPrice = parseFloat(priceMatch[1].replace(",", "."));
      }

      let cleanName = seg
        .replace(
          /\b(actually i don't need|actually i dont need|i don't need|i dont need|don't need|dont need|no need for|no need|actually don't need|actually not|i don't want|i dont want|don't want|dont want|don't buy|dont buy|cancel the|forget the|delete the|remove the|i need to buy|need to buy|i need to|i need|need|i want to buy|i want to|i want|want|buy|get|purchase|we have|we got|add|remove|delete|finished|expired|não preciso de|nao preciso de|não preciso|não quero|esquece o|cancela o|preciso de comprar|preciso comprar|preciso de|preciso|comprar|temos|acabou)\b/gi,
          ""
        )
        .replace(
          /\b(from|at|in|to|de|no|na|do|da)\s+(continente|pingo doce|pingodoce|lidl|mercadona|auchan|aldi|prisma|ksupermarket|intermarche|intermarché|minipreco|minipreço|carrefour|store|pantry|shopping list|loja|supermercado|despensa)\b/gi,
          ""
        )
        .replace(/\b(some|a bit of|few|um pouco de|algum|alguns|algumas|the|o|a|os|as)\b/gi, "")
        .replace(/(?:for|a|por|custou|custa|at)\s*(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros|\$)?/gi, "")
        .trim();

      if (!cleanName) cleanName = seg;
      cleanName = canonicalizeItemName(cleanName, languageInfo.code);
      const category = detectCategory(cleanName);

      // Detect supermarket specific to this item segment
      let segStore = defaultStore;
      let storeReasoning = "";
      if (/continente/i.test(seg)) {
        segStore = "Continente";
        storeReasoning = "Assigned to Continente as requested.";
      } else if (/pingo\s*doce|pingodoce/i.test(seg)) {
        segStore = "Pingo Doce";
        storeReasoning = "Assigned to Pingo Doce as requested.";
      } else if (/mercadona/i.test(seg)) {
        segStore = "Mercadona";
        storeReasoning = "Assigned to Mercadona as requested.";
      } else if (/auchan|jumbo/i.test(seg)) {
        segStore = "Auchan";
        storeReasoning = "Assigned to Auchan as requested.";
      } else if (/aldi/i.test(seg)) {
        segStore = "Aldi";
        storeReasoning = "Assigned to Aldi as requested.";
      } else if (/lidl/i.test(seg)) {
        segStore = "Lidl";
        storeReasoning = "Assigned to Lidl as requested.";
      } else if (/prisma/i.test(seg)) {
        segStore = "Prisma";
        storeReasoning = "Assigned to Prisma as requested.";
      } else if (/k-?supermarket/i.test(seg)) {
        segStore = "KSupermarket";
        storeReasoning = "Assigned to KSupermarket as requested.";
      } else {
        // Default to user's selected store
        segStore = defaultStore || "Lidl";
        storeReasoning = `Assigned to ${segStore}.`;
      }

      if (isRemoval) {
        // Check shopping list first
        const shopMatch = shoppingListItems.find(
          (s) =>
            s.name.toLowerCase().includes(cleanName.toLowerCase()) ||
            cleanName.toLowerCase().includes(s.name.toLowerCase())
        );
        if (shopMatch) {
          return {
            id: `draft-${Date.now()}-${idx}`,
            actionType: "remove_from_store",
            name: shopMatch.name,
            category: shopMatch.category,
            quantity: shopMatch.quantity,
            unit: shopMatch.unit || "pcs",
            store: shopMatch.targetStore || segStore,
            price: shopMatch.price || 0,
            selected: true,
            imageUrl: shopMatch.imageUrl || "",
            reasoning: `Decided not to purchase → Remove from ${shopMatch.targetStore} shopping list.`,
            existingItemId: shopMatch.id,
          };
        }

        // Check pantry
        const pantryMatch = pantryItems.find(
          (p) =>
            p.name.toLowerCase().includes(cleanName.toLowerCase()) ||
            cleanName.toLowerCase().includes(p.name.toLowerCase())
        );
        if (pantryMatch) {
          return {
            id: `draft-${Date.now()}-${idx}`,
            actionType: "remove_from_pantry",
            name: pantryMatch.name,
            category: pantryMatch.category,
            quantity: pantryMatch.quantity,
            unit: pantryMatch.unit || "pcs",
            store: pantryMatch.targetStore || segStore,
            price: pantryMatch.price || 0,
            selected: true,
            imageUrl: pantryMatch.imageUrl || "",
            reasoning: `Consumed or expired → Remove from pantry inventory.`,
            existingItemId: pantryMatch.id,
            existingPantryQty: pantryMatch.quantity,
          };
        }

        // If not found in shopping list or pantry, DO NOT create a phantom removal
        return null;
      }

      // Check if in pantry
      const pantryMatch = pantryItems.find(
        (p) =>
          p.name.toLowerCase().includes(cleanName.toLowerCase()) ||
          cleanName.toLowerCase().includes(p.name.toLowerCase())
      );

      if (pantryMatch) {
        return {
          id: `draft-${Date.now()}-${idx}`,
          actionType: "move_pantry_to_store",
          name: pantryMatch.name,
          category: pantryMatch.category,
          quantity: 1,
          unit: pantryMatch.unit || "pcs",
          store: pantryMatch.targetStore || segStore,
          price: pantryMatch.price || segPrice || 0,
          selected: true,
          imageUrl: pantryMatch.imageUrl || "",
          reasoning: `Found in Pantry (${pantryMatch.quantity} ${pantryMatch.unit} in stock) → Move to ${segStore} shopping list to restock!`,
          existingItemId: pantryMatch.id,
          existingPantryQty: pantryMatch.quantity,
        };
      }

      return {
        id: `draft-${Date.now()}-${idx}`,
        actionType: "add_to_store",
        name: cleanName,
        category,
        quantity: 1,
        unit: "pcs",
        store: segStore,
        price: segPrice,
        selected: true,
        imageUrl: "",
        reasoning: `${storeReasoning} (Not found in pantry → Add fresh to shopping list).`,
      };
    }).filter(Boolean) as SmartActionDraft[];

    setIsLoading(false);
    setTextInput("");

    if (drafts.length === 0) {
      setErrorMessage(
        languageInfo.code === "pt"
          ? "O item mencionado não se encontra na lista de compras nem na despensa, pelo que nada foi alterado."
          : "The item mentioned is not on your shopping list or pantry, so nothing was changed."
      );
      return;
    }

    onSmartActionsParsed(drafts);
  };

  // Add raw as is (un-interpreted simple addition preserving user's typed name)
  const handleAddAsIs = () => {
    if (!textInput.trim()) return;
    const raw = textInput.trim();
    const cleanName = raw.charAt(0).toUpperCase() + raw.slice(1);
    const cat = detectCategory(cleanName);
    const draft: SmartActionDraft = {
      id: `asis-${Date.now()}`,
      actionType: "add_to_store",
      name: cleanName,
      category: cat,
      quantity: 1,
      unit: "pcs",
      store: defaultStore,
      price: 2.49,
      selected: true,
      imageUrl: "",
      reasoning: "Entered directly as-is",
    };
    setTextInput("");
    onSmartActionsParsed([draft]);
  };

  // Scan or Upload Receipt image with Multimodal AI
  const handleReceiptFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingMessage("Analyzing receipt with AI...");
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;

      try {
        const response = await fetch("/api/ai/parse-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || "image/jpeg",
            shoppingListItems,
            pantryItems,
            defaultStore,
            language: languageInfo.code,
            languageName: languageInfo.nativeName,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            const drafts: SmartActionDraft[] = data.items.map(
              (item: any, idx: number) => {
                // Trust the AI's translation, canonical naming, and category classification directly
                const itemName = item.name?.trim() || "Item";
                const itemCategory = item.category || "Pantry";
                return {
                  id: `receipt-${Date.now()}-${idx}`,
                  actionType:
                    item.actionType === "move_store_to_pantry"
                      ? "move_store_to_pantry"
                      : "add_to_pantry",
                  name: itemName,
                  category: itemCategory,
                  quantity: item.quantity || 1,
                  unit: item.unit || "pcs",
                  store: data.storeName || defaultStore,
                  price: Number((item.price || 0).toFixed(2)),
                  selected: true,
                  imageUrl: "",
                  reasoning:
                    item.reasoning ||
                    (item.actionType === "move_store_to_pantry"
                      ? `Matched on your shopping list! Checked off and moving to pantry.`
                      : `Receipt purchase at ${data.storeName || defaultStore} → Added to Home Pantry.`),
                  existingItemId: item.existingItemId,
                };
              }
            );

            setIsLoading(false);
            onSmartActionsParsed(drafts, {
              storeName: data.storeName || defaultStore,
              totalAmount: data.totalAmount || 0,
              currency: data.currency || "€",
              purchaseDate: data.purchaseDate,
            });
            return;
          }
        }

        const errJson = await response.json().catch(() => ({}));
        throw new Error(
          errJson.error ||
            "Could not read grocery items from this receipt photo. Please upload a clear photo with items and prices visible."
        );
      } catch (err: any) {
        console.error("Receipt scan error:", err);
        setIsLoading(false);
        setErrorMessage(
          err.message ||
            "Could not read receipt image. Please ensure the receipt is well-lit and clearly visible."
        );
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Outer Moving Gradient Frame to remind of AI */}
      <div
        id="add-items-modal"
        className="relative rounded-[26px] p-[1.5px] bg-gradient-to-r from-emerald-500 via-teal-400 via-amber-400 via-sky-400 to-emerald-500 animate-gradient-flow shadow-[0_0_50px_rgba(16,185,129,0.3)] max-w-lg w-full animate-in zoom-in-95 duration-200"
      >
        {/* Inner Content Card */}
        <div className="bg-white rounded-[24px] p-6 sm:p-7 relative overflow-hidden flex flex-col max-h-[92vh]">
          {/* Ambient AI Aurora Glow in Header */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-44 bg-gradient-to-b from-emerald-400/20 via-teal-300/15 to-transparent blur-3xl pointer-events-none rounded-full" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 hover:bg-stone-100 p-1.5 rounded-full transition cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-5 shrink-0 relative">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              {t("add_items")}
            </h2>
            <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
              Receipt vision scan, speech transcribe, or smart prompt
            </p>
          </div>

          {errorMessage && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium animate-in fade-in duration-150">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="py-14 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 via-amber-300 to-indigo-400 animate-spin-slow opacity-85 blur-md" />
                <div className="relative w-full h-full rounded-2xl bg-white flex items-center justify-center border border-emerald-200 shadow-md">
                  <Sparkles className="w-7 h-7 text-emerald-600 animate-pulse" />
                </div>
              </div>
              <div>
                <p className="font-bold text-stone-900 text-sm">
                  {loadingMessage}
                </p>
                <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                  Cross-referencing your {pantryItems.length} pantry items & {shoppingListItems.length} shopping list items...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* OPTION 1: Select Receipt to Scan (Multimodal AI) */}
              <div className="relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReceiptFileChange}
                />
                <button
                  id="select-receipt-btn"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 rounded-2xl border border-stone-200/90 hover:border-emerald-500/70 bg-gradient-to-r from-stone-50/80 via-white to-emerald-50/30 hover:to-emerald-50/60 text-stone-900 transition-all shadow-2xs hover:shadow-md flex items-center justify-between gap-3 text-left cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">
                          Scan Receipt Photo
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                          Vision AI
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                        Multimodal AI reads items, stores & prices automatically
                      </p>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-stone-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0 text-stone-400">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>

              {/* DIVIDER 1: "or" with subtle gradient line */}
              <div className="relative flex items-center justify-center py-0.5">
                <div className="border-t border-stone-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-stone-400 uppercase tracking-widest absolute">
                  or
                </span>
              </div>

              {/* OPTION 2: Microphone Circle Button (Gemini Transcribe) with Aura */}
              <div className="p-4 rounded-2xl border border-stone-200/90 bg-gradient-to-b from-stone-50/70 via-white to-stone-50/40 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
                {/* Moving gradient aura behind microphone (light effect) */}
                <div className="relative my-1">
                  <div
                    className={`absolute -inset-2.5 rounded-full transition-all duration-300 blur-md ${
                      isRecording
                        ? "bg-rose-500/50 animate-ping"
                        : "bg-gradient-to-r from-emerald-500 via-teal-400 via-amber-400 to-emerald-500 animate-gradient-flow opacity-85"
                    }`}
                  />

                  <button
                    id="voice-mic-button"
                    type="button"
                    onClick={isRecording ? stopAudioRecording : startAudioRecording}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer border border-stone-200/90 hover:border-emerald-400 ${
                      isRecording
                        ? "bg-rose-600 text-white ring-4 ring-rose-200 shadow-rose-500/40 scale-105"
                        : "bg-white hover:bg-stone-50 text-emerald-600 shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:scale-108"
                    }`}
                    title={
                      isRecording
                        ? "Click to finish and send to Gemini Transcribe"
                        : "Click to record voice with Gemini Transcribe"
                    }
                  >
                    {isRecording ? (
                      <MicOff className="w-7 h-7 animate-pulse text-white stroke-[2.2]" />
                    ) : (
                      <Mic className="w-7 h-7 text-emerald-600 stroke-emerald-600 stroke-[2.2]" />
                    )}
                  </button>
                </div>

                {/* Voice Status & Animated Soundwave Bars if recording */}
                <div>
                  {isRecording ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center gap-1.5 h-6">
                        <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1 h-4 bg-rose-500 rounded-full animate-bounce [animation-delay:300ms]" />
                        <span className="w-1 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:100ms]" />
                        <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:250ms]" />
                      </div>
                      <p className="text-xs font-bold text-rose-700">
                        {languageInfo.code === "pt"
                          ? `A ouvir com Gemini... (${recordingSeconds}s) • Toque para enviar`
                          : `Listening with Gemini... (${recordingSeconds}s) • Tap to send`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-stone-800 pt-4" style={{ paddingTop: "16px" }}>
                        {languageInfo.code === "pt"
                          ? "Toque no microfone para falar (Gemini Transcribe)"
                          : "Tap microphone to speak (Gemini Transcribe)"}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Natural grocery speech in Portuguese, English, Spanish & more
                      </p>
                    </div>
                  )}
                </div>

                {micPermissionDenied && (
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 text-left space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        {languageInfo.code === "pt"
                          ? "Microfone bloqueado no navegador"
                          : "Microphone blocked in browser"}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      {languageInfo.code === "pt"
                        ? "Para usar a voz, clique no cadeado ou definições (🔒) na barra de endereço do navegador e autorize o Microfone, depois clique em Tentar Novamente."
                        : "To use voice input, click the lock/settings icon (🔒) in your browser's address bar and set Microphone to Allow, then tap Retry."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMicPermissionDenied(false);
                        setErrorMessage(null);
                        startAudioRecording();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold rounded-lg text-[11px] transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>
                        {languageInfo.code === "pt"
                          ? "Tentar Microfone Novamente"
                          : "Retry Microphone"}
                      </span>
                    </button>
                  </div>
                )}

                {speechTranscript && (
                  <div className="w-full bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-xs text-stone-800 text-left">
                    <span className="font-semibold text-emerald-800 text-[10px] block uppercase tracking-wider mb-0.5">
                      Transcribed:
                    </span>
                    "{speechTranscript}"
                  </div>
                )}
              </div>

              {/* DIVIDER 2: "or" with subtle gradient line */}
              <div className="relative flex items-center justify-center py-0.5">
                <div className="border-t border-stone-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-stone-400 uppercase tracking-widest absolute">
                  or
                </span>
              </div>

              {/* OPTION 3: Input text + Smart Interpret with Moving Gradient Button */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="modal-quick-text-input"
                      type="text"
                      placeholder="Type anything (e.g. 'need eggs, tomatoes and coffee')"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") interpretPromptWithAI(textInput);
                      }}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition"
                    />
                  </div>

                  <button
                    id="smart-interpret-btn"
                    type="button"
                    onClick={() => interpretPromptWithAI(textInput)}
                    disabled={!textInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 animate-gradient-flow disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer active:scale-95"
                    title="Interpret with AI against Pantry inventory"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                    <span>Interpret</span>
                  </button>

                  <button
                    id="add-as-is-button"
                    type="button"
                    onClick={handleAddAsIs}
                    disabled={!textInput.trim()}
                    className="inline-flex items-center gap-1 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 font-semibold text-xs rounded-xl transition shrink-0 cursor-pointer active:scale-95"
                    title="Add directly without AI interpretation"
                  >
                    <span>As is</span>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
