import React, { useState, useEffect, useRef } from "react";
import notificationApi from "../api/notificationsApi";
import { format } from 'date-fns';

function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [email, setEmail] = useState(null);
    const webSocketRef = useRef(null);

    //  localStorage에서 email 가져오기
    useEffect(() => {
        const storedEmail = localStorage.getItem("X-Auth-User");
        console.log("📌 저장된 이메일:", storedEmail); //  콘솔 출력
        if (storedEmail) {
            setEmail(storedEmail);
        } else {
            console.warn("❌ Email이 localStorage에 없습니다.");
            setError("로그인이 필요한 서비스입니다.");
        }
    }, []);
    
    //  알림 목록 가져오기
    useEffect(() => {
        if (!email) return;

        const fetchNotifications = async () => {
            try {
                setLoading(true);
                const data = await notificationApi.fetchNotifications(email);
                console.log("📌 백엔드에서 받은 알림 데이터:", data); //  API 응답 확인
        
                const formattedNotifications = data.map(notification => ({
                    id: notification.id, // 🔥 undefined 방지
                    symbol: notification.symbol,
                    targetPrice: notification.targetPrice,
                    triggeredPrice: notification.triggeredPrice,
                    condition: notification.condition,
                    timestamp: new Date(notification.triggeredAt),
                    message: formatNotificationMessage(notification)
                })).sort((a, b) => b.timestamp - a.timestamp);
        
                setNotifications(formattedNotifications);
                setError(null);
            } catch (err) {
                console.error("❌ 알림 목록 가져오기 실패:", err);
                setError("알림 정보를 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };
        

        fetchNotifications();
    }, [email]);

    //  WebSocket 연결 설정
    useEffect(() => {
        if (!email) return;

        // WebSocket 연결
        const connectWebSocket = () => {
            const ws = new WebSocket(`ws://34.210.11.121:8080/ws/socket/alert?email=${email}`);
            
            ws.onopen = () => {
                console.log("✅ 알림 WebSocket 연결 성공");
            };
            
            ws.onmessage = (event) => {
                try {
                    console.log("📩 새 알림 수신:", event.data);
            
                    // 메시지가 JSON 형식인지 확인하고 파싱
                    const alertData = JSON.parse(event.data);
            
                    if (!alertData || !alertData.symbol) {
                        console.warn("⚠️ 잘못된 알림 데이터 형식:", event.data);
                        return;
                    }

                    
            
                    const formattedAlert = {
                        id: alertData.id || Date.now(), // ID가 없으면 임시로 타임스탬프 사용
                        symbol: alertData.symbol,
                        targetPrice: alertData.targetPrice,
                        triggeredPrice: alertData.triggeredPrice,
                        condition: alertData.condition,
                        timestamp: new Date(alertData.timestamp || Date.now()),
                        message: formatNotificationMessage(alertData)
                    };
            
                    // 새 알림을 목록 최상단에 추가
                    setNotifications(prev => [formattedAlert, ...prev]);

                   
            
                } catch (parseError) {
                    console.error("❌ WebSocket 메시지 파싱 실패:", parseError);
                    console.log("📩 수신한 메시지 원본:", event.data);
                }
            };
            
            ws.onerror = (error) => {
                console.error("❌ WebSocket 오류:", error);
            };
            
            ws.onclose = (event) => {
                console.log("🚪 WebSocket 연결 종료:", event.code, event.reason);
                // 연결이 끊어지면 재연결 시도
                setTimeout(() => {
                    console.log("🔄 WebSocket 재연결 시도...");
                    connectWebSocket();
                }, 3000);
            };
            
            webSocketRef.current = ws;
        };
        
        connectWebSocket();
        
        // 컴포넌트 언마운트 시 WebSocket 연결 해제
        return () => {
            if (webSocketRef.current) {
                webSocketRef.current.close();
            }
        };
    }, [email]);

    //  알림 형식 지정 함수
    const formatNotificationMessage = (notification) => {
        if (!notification) return "";
        
        const condition = notification.condition === "ABOVE" ? "이상" : "이하";
        const symbol = notification.symbol || "알 수 없음";
     
        // 종목 유형 판별
        let priceDisplay = "";
        if (/^\d+$/.test(symbol)) {
            // 국내주식
            priceDisplay = `${notification.triggeredPrice?.toLocaleString()}원`;
        } else if (symbol.includes('-')) {
            // 암호화폐
            const baseCurrency = symbol.split('-')[0];
            priceDisplay = baseCurrency === 'KRW' 
                ? `${notification.triggeredPrice?.toLocaleString()}원`
                : `$${notification.triggeredPrice?.toLocaleString()}`;
        } else {
            // 해외주식
            priceDisplay = `$${notification.triggeredPrice?.toLocaleString()}`;
        }
        console.log(priceDisplay);
        
        return `🔔 ${symbol} 가격 알림 - 목표가(${condition}) ${notification.targetPrice?.toLocaleString()}에 도달했습니다. 현재가: ${priceDisplay}`;
    };

    //  알림 삭제 처리
    const handleDeleteNotification = async (id) => {
        console.log("📌 삭제 요청 알림 ID:", id); //  id 값 확인
        if (!id) {
            console.error("❌ 알림 삭제 요청 실패: ID가 undefined입니다.");
            return;
        }
    
        try {
            await notificationApi.deleteNotification(id, email);
            setNotifications(prev => prev.filter(notification => notification.id !== id));
        } catch (err) {
            console.error("❌ 알림 삭제 실패:", err);
            alert("알림 삭제에 실패했습니다.");
        }
    };
    
    //  시간 포맷팅 함수
    const formatTimestamp = (timestamp) => {
        try {
            return format(new Date(timestamp), 'yyyy-MM-dd HH:mm');
        } catch (err) {
            return "날짜 정보 없음";
        }
    };

    if (loading) {
        return (
            <div className="container py-4 text-light text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">알림 정보를 불러오는 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container py-4 text-light">
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4 text-light">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="text-white fw-bold m-0">📢 알림 목록</h3>
                {notifications.length > 0 && (
                    <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => {
                            if (window.confirm("모든 알림을 삭제하시겠습니까?")) {
                                // 전체 알림 삭제 로직 구현 필요
                                alert("아직 구현되지 않은 기능입니다.");
                            }
                        }}
                    >
                        전체 삭제
                    </button>
                )}
            </div>

            {notifications.length > 0 ? (
                <div className="list-group">
                    {notifications.map((notification) => {
                        
                        console.log("📌 알림 목록 ID:", notification.id); // id 값 확인

                        return (
                            <div 
                                key={notification.id} 
                                className="list-group-item bg-dark text-light border-secondary d-flex justify-content-between align-items-start"
                            >
                                <div className="ms-2 me-auto">
                                    <div className="d-flex w-100 justify-content-between">
                                        <div>{notification.message}</div>
                                    </div>
                                    <small className="text-secondary">
                                        {formatTimestamp(notification.timestamp)}
                                    </small>
                                </div>
                                <button
                                    className="btn btn-sm btn-outline-danger ms-2"
                                    onClick={() => handleDeleteNotification(notification.id)}
                                >
                                    삭제
                                </button>
                            </div>
                        );
                    })}

                </div>
            ) : (
                <div className="text-center p-5 border border-secondary rounded">
                    <p className="text-secondary mb-0">알림이 없습니다.</p>
                    <small className="text-muted">
                        종목 상세 페이지에서 가격 알림을 설정해보세요.
                    </small>
                </div>
            )}
        </div>
    );
}

export default Notifications;