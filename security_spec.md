# Security Specification

## 1. Data Invariants

1. **User Profiles**:
   - A profile can only be created by its owner (`request.auth.uid == userId`).
   - The user cannot change their own username once set, or spoof names.
   - Profile documents must contain a `username` (string <= 30 chars), `displayName` (string <= 50 chars), `createdAt`, and `updatedAt`.
   
2. **Memos**:
   - Memos can only be created by any authenticated user representing themselves (`request.resource.data.userId == request.auth.uid`).
   - The Memo must have valid fields: `content`, `mediaUrls`, `visibility`, `tags`, etc., with reasonable size bounds.
   - Once created, the `userId`, `username`, and `createdAt` are immutable.
   - A user can only delete or edit their own memos.
   - For `update`, users can only alter `content`, `mediaUrls`, `visibility`, `tags`, `likesCount`, `commentsCount` and `updatedAt`.

3. **Comments**:
   - Nested under `/memos/{memoId}/comments/{commentId}`.
   - Any authenticated user can comment. `userId` in the payload must match `request.auth.uid`.
   - Creating a comment requires verifying that the target memo exists.

4. **Likes**:
   - Nested under `/memos/{memoId}/likes/{userId}` where the document ID is the user's ID.
   - A user can only write their own like document.
   - The `userId` must match `request.auth.uid`.

5. **Follows**:
   - Stored in the global collection `follows` under the ID `${followerId}_${followingId}`.
   - A user can only create or delete a follow document where they are the `followerId`.
   - The follower cannot follow themselves.

---

## 2. The "Dirty Dozen" Payloads (Rogue Attacks)

The following payloads are designed to breach security gates and must be blocked:

1. **Spoofed User Registration (Shadow Profile)**:
   - *Payload*: `{ "username": "admin", "displayName": "System Admin", "createdAt": "2026-06-04T15:59:37Z", "updatedAt": "2026-06-04T15:59:37Z" }` sent to `/users/another_different_uid`.
   - *Outcome*: Rejected because document ID does not match auth.uid.

2. **Username Overwrite**:
   - *Payload*: `{ "username": "new_username", "displayName": "Modified Display Name", "updatedAt": request.time }` updating `/users/my_uid`.
   - *Outcome*: Rejected because `username` is immutable.

3. **Spoofed Creator ID on Memo Create**:
   - *Payload*: `{ "userId": "victim_uid", "username": "attacker", "displayName": "Attacker", "content": "Fake post", "mediaUrls": [], "visibility": "public", "tags": [], "likesCount": 0, "commentsCount": 0, "createdAt": "2026-06-04T15:59:37Z" }` sent to `/memos/random_id`.
   - *Outcome*: Rejected because payload `userId` doesn't match auth.uid.

4. **Shadow Write / Extra Fields on Memo Create**:
   - *Payload*: `{ "userId": "my_uid", "username": "attacker", "displayName": "Attacker", "content": "Fake post", "mediaUrls": [], "visibility": "public", "tags": [], "likesCount": 99999, "commentsCount": 0, "createdAt": "2026-06-04T15:59:37Z", "ghostField": "malicious" }` sent to `/memos/random_id`.
   - *Outcome*: Rejected due to exact size matching and key validations.

5. **Memo Hijack (Another user editing my Memo)**:
   - *Payload*: `{ "content": "Defaced by attacker", "updatedAt": request.time }` updating `/memos/victim_memo_id` by user `attacker_uid`.
   - *Outcome*: Rejected because only the memo owner can edit content.

6. **Memo Immutable Field Poisoning**:
   - *Payload*: `{ "userId": "new_uid", "content": "Attacking immutable fields", "updatedAt": request.time }` updating `/memos/my_memo_id`.
   - *Outcome*: Rejected because `userId` cannot be modified.

7. **Like Injection (Liking on behalf of someone else)**:
   - *Payload*: `{ "userId": "victim_uid", "createdAt": request.time }` sent to `/memos/memo_id/likes/victim_uid` by `attacker_uid`.
   - *Outcome*: Rejected because document ID and userId must match auth.uid.

8. **Comment Identity Theft**:
   - *Payload*: `{ "memoId": "memo_id", "userId": "victim_uid", "username": "victim", "displayName": "Victim", "content": "Malicious comment", "createdAt": request.time }` sent to `/memos/memo_id/comments/comment_id` by `attacker_uid`.
   - *Outcome*: Rejected because `userId` must match auth.uid.

9. **Follow Interception (Following for someone else)**:
   - *Payload*: `{ "followerId": "victim_uid", "followingId": "target_uid", "createdAt": request.time }` sent to `/follows/victim_uid_target_uid` by `attacker_uid`.
   - *Outcome*: Rejected because `followerId` must match auth.uid.

10. **Self-Following Loop**:
    - *Payload*: `{ "followerId": "my_uid", "followingId": "my_uid", "createdAt": request.time }` sent to `/follows/my_uid_my_uid`.
    - *Outcome*: Rejected because followerId cannot equal followingId.

11. **Client-side Query Scraping (Insecure List)**:
    - *Query*: Reading all `/memos` where `visibility == 'private'` without filtering by current user.
    - *Outcome*: Rejected because the `list` rule explicitly checks `resource.data.visibility == 'public' || resource.data.userId == request.auth.uid`.

12. **Denial-of-Wallet Long ID Injection**:
    - *Payload*: Creating a document at `/memos/a_very_long_100kb_garbage_id` with arbitrary data.
    - *Outcome*: Rejected by matches and `isValidId()` string limit guards (ID <= 128 chars).

---

## 3. Test Cases (Security Test Outline)

```ts
// All tests mock request.auth to represent different states:
// - Anonymous / Not signed-in
// - User A (unverified email)
// - User A (verified email)
// - User B (verified email)
//
// Operations executed:
// - Creating, reading, updating profiles
// - Posting memos with rogue parameters (likesCount, visibility, user_id)
// - Deleting resources
// - Listing private resources of another user
// Let's verify that ALL invalid actions return Permission Denied.
```
