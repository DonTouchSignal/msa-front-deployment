import React, { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const WebSocketComponent = ({ userId }) => {
    const [notifications, setNotifications] = useState([]);
    const socketUrl = "http://34.210.11.121:8080/ws"; // Spring Boot WebSocket 엔드포인트

    useEffect(() => {
        const socket = new SockJS(socketUrl);
        const stompClient = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                console.log("✅ WebSocket 연결됨");
                stompClient.subscribe(`/topic/notifications/${userId}`, (message) => {
                    console.log("📩 WebSocket 메시지 수신:", message.body);
                    setNotifications((prev) => [...prev, message.body]);
                });
            },
            onDisconnect: () => console.log("❌ WebSocket 연결 종료됨"),
        });

        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    }, [userId]);

    return (
        <div>
            <h3>📢 실시간 알림</h3>
            <ul>
                {notifications.map((msg, index) => (
                    <li key={index}>{msg}</li>
                ))}
            </ul>
        </div>
    );
};

export default WebSocketComponent;
