# TICKET-1102: Friends·Chat 모듈 테스트

> **Epic:** 11-unit-tests
> **커밋 메시지:** `test: add unit tests for friends and chat modules`

## 생성 파일
- `modules/friends/friends.service.spec.ts`
- `modules/friends/friends.controller.spec.ts`
- `modules/chat/chat.service.spec.ts`
- `modules/chat/chat.controller.spec.ts`
- `modules/chat/gateways/chat.gateway.spec.ts`

## 테스트 항목
- FriendsService: sendRequest, accept, remove, block, isBlocked, list
- FriendsController: 각 엔드포인트
- ChatService: getConversations, getMessages, markAsRead, saveMessage
- ChatController: 각 엔드포인트
- ChatGateway: chat:send(차단·XSS·스팸), chat:read, chat:typing
