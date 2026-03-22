export const MEDIA = {
  JIEDAN: "![结丹成功](https://cdn.superintern.ai/media/chat_history_files/57e9ea50-312c-4201-960c-57dbf5156155/f208b0bf-ea6a-4fe1-9404-d9131ed7cfbf.mp4)",
  DACHENG: "![晋升大乘](https://cdn.superintern.ai/media/chat_history_files/47e2a805-f901-4dca-bf7d-98fe241da924/868a1173-731a-406a-aa89-852b0f9e0d12.mp4)",
  JINXIAN: "![成就金仙](https://cdn.superintern.ai/media/chat_history_files/b7770e44-02a3-447d-a6b5-36b3023fd9ab/4dce4c7d-9930-4f3f-9acb-05e310b4626c.mp4)",
  ASCEND_SPIRIT: "![飞升灵界](https://cdn.superintern.ai/media/chat_history_files/0f18679a-8b75-4e56-9b49-3dedcc297317/6bbb0e10-813d-4408-9221-1ae75f96c0c0.mp4)",
  ASCEND_IMMORTAL: "![飞升仙界](https://cdn.superintern.ai/media/chat_history_files/29153f25-2abe-4cf1-bb3a-03997c1c453a/6902a88b-d5bc-445e-8040-32d74b1e58e0.mp4)",
  SECT_WAR_FINAL: "![宗派大战](https://test-cdn.fakersai.com/media/chat_history_files/c7b364f9-41f6-4290-bc19-840e93a19d91/edde1b84-2c45-4429-bf4d-8149dd5e785c.mp4)",
} as const;

export function appendMedia(list: string[], ...items: string[]): string[] {
  const set = new Set(list);
  for (const item of items) {
    if (item) set.add(item);
  }
  return [...set];
}
