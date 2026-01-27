"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { 
  onAuthStateChanged, User, signOut, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile 
} from "firebase/auth";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, updateDoc, deleteDoc, getDocs } from "firebase/firestore";

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    // 1. ログイン状態の監視
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setLoading(false); 
    });

    const productId = params.id as string;
    if (!productId) return;

    // ★既読時間を保存（このページを開いた時間を記録）
    localStorage.setItem(`lastSeen_${productId}`, Date.now().toString());

    // 2. 商品情報のリアルタイム取得
    const unsubProduct = onSnapshot(doc(db, "products", productId), (d) => {
      if (d.exists()) setProduct({ id: d.id, ...d.data() });
    });

    // 3. チャットのリアルタイム取得
    const chatQuery = query(collection(db, "products", productId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribeChat = onSnapshot(chatQuery, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubscribeAuth(); unsubProduct(); unsubscribeChat(); };
  }, [params.id]);

  // 購入処理
  const handleBuy = async () => {
    if (!product || product.isSold || !user) return;
    if (!confirm("購入を確定しますか？これ以降は出品者と専用チャットになります。")) return;
    try {
      await updateDoc(doc(db, "products", product.id), { 
        isSold: true, 
        buyerId: user.uid 
      });
      alert("購入しました！");
    } catch (e) { alert("購入に失敗しました"); }
  };

  // 出品取消処理
  const handleDelete = async () => {
    if (!product || !user || user.uid !== product.sellerId) return;
    if (!confirm("出品を取り消しますか？")) return;
    try {
      await deleteDoc(doc(db, "products", product.id));
      router.push("/");
    } catch (e) { alert("削除失敗"); }
  };

  // メッセージ送信
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;
    // 売却済みの場合は当事者以外ブロック
    if (product.isSold && user.uid !== product.sellerId && user.uid !== product.buyerId) return;

    await addDoc(collection(db, "products", params.id as string, "messages"), {
      text: newMessage,
      createdAt: new Date(),
      sender: user.displayName,
      senderPhoto: user.photoURL,
      uid: user.uid
    });
    // ★送信時も既読時間を更新
    localStorage.setItem(`lastSeen_${params.id}`, Date.now().toString());
    setNewMessage("");
  };

  if (loading) return <div className="p-10 text-center text-blue-600">Loading...</div>;
  if (!product) return <div className="p-10 text-center">商品が見つかりません</div>;

  const isSeller = user?.uid === product.sellerId;
  const isBuyer = user?.uid === product.buyerId;
  const isParticipant = isSeller || isBuyer;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-800">
      <header className="p-4 bg-white border-b flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.back()} className="text-blue-600 font-bold text-xl">←</button>
        <h1 className="font-bold text-sm">取引・相談</h1>
        {isSeller && !product.isSold && (
          <button onClick={handleDelete} className="text-[10px] text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 font-bold">出品取消</button>
        )}
      </header>

      {/* 商品情報カード */}
      <div className="bg-white p-4 shadow-sm border-b mb-4 flex gap-4 relative">
        <div className="relative">
          <img src={product.image} className="w-24 h-24 object-cover rounded-xl shadow-md border" />
          {product.isSold && <div className="absolute top-0 left-0 bg-red-600 text-white font-bold px-2 py-1 rounded-tl-xl rounded-br-xl text-[10px]">SOLD</div>}
        </div>
        <div className="flex-grow">
          <h2 className="font-bold text-lg leading-tight">{product.name}</h2>
          <p className="text-orange-500 font-bold text-xl">¥{product.price?.toLocaleString()}</p>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{product.category}</span>
          
          {!product.isSold ? (
            <button onClick={handleBuy} className="mt-2 w-full bg-red-600 text-white text-xs font-bold py-2 rounded-lg shadow-md active:scale-95 transition">
              購入手続きへ
            </button>
          ) : (
            <div className="mt-2 text-center text-gray-400 text-[10px] font-bold py-2 border rounded-lg bg-gray-50">
              {isParticipant ? "取引進行中" : "売り切れました"}
            </div>
          )}
        </div>
      </div>

      {/* チャット履歴 */}
      <div className="max-w-2xl mx-auto px-4 space-y-4 mb-20 mt-4">
        {product.isSold && !isParticipant ? (
          <div className="p-10 text-center text-gray-400 text-sm bg-gray-100 rounded-2xl">
            この取引は終了しています。
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex items-start gap-2 ${m.uid === user?.uid ? "flex-row-reverse" : "flex-row"}`}>
              <img src={m.senderPhoto || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} className="w-8 h-8 rounded-full border bg-white object-cover" />
              <div className={`flex flex-col ${m.uid === user?.uid ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1 mb-0.5">
                   <span className="text-[9px] text-gray-400 font-bold">{m.sender}</span>
                   {m.uid === product.sellerId && <span className="text-[7px] bg-orange-100 text-orange-600 px-1 rounded font-bold border border-orange-200">出品者</span>}
                </div>
                <div className={`p-3 rounded-2xl max-w-[200px] shadow-sm ${m.uid === user?.uid ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border rounded-tl-none"}`}>
                  <p className="text-sm">{m.text}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 下部フォーム */}
      {(!product.isSold || isParticipant) && user && (
        <div className="fixed bottom-0 w-full bg-white border-t p-4 shadow-lg z-20">
          <form onSubmit={sendMessage} className="max-w-2xl mx-auto flex gap-2">
            <input 
              type="text" 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              placeholder={product.isSold ? "購入者専用チャットです" : "質問を送る..."} 
              className="flex-grow border rounded-full px-4 py-2 text-sm bg-gray-50 outline-none focus:ring-1 focus:ring-blue-400" 
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm shadow-md active:scale-95">送信</button>
          </form>
        </div>
      )}
    </div>
  );
}