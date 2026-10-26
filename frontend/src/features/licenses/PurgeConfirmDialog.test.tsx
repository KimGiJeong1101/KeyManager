import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PurgeConfirmDialog from "./PurgeConfirmDialog";
import { DeletedItem } from "../../types/item";

const item: DeletedItem = {
  no: 7,
  key: "ABCDE-12345-FGHIJ-67890-KLMNO",
  member: null,
  category: "Windows",
  version: "Windows 10 Pro",
  memo: null,
  deleted_at: null,
};

const setup = (overrides: Partial<React.ComponentProps<typeof PurgeConfirmDialog>> = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<PurgeConfirmDialog item={item} isPurging={false} onConfirm={onConfirm} onCancel={onCancel} {...overrides} />);
  return {
    onConfirm,
    onCancel,
    input: screen.getByLabelText(/마지막 5자리/),
    // 상태에 따라 버튼 이름이 바뀌므로("삭제 중...") 필요할 때 찾는다
    button: () => screen.getByRole("button", { name: "완전삭제" }),
  };
};

describe("PurgeConfirmDialog", () => {
  it("마지막 5자리를 정확히 입력해야 완전삭제 버튼이 켜진다 (대소문자 무관)", async () => {
    const user = userEvent.setup();
    const { input, button, onConfirm } = setup();
    expect(button()).toBeDisabled();

    await user.type(input, "klmn");
    expect(button()).toBeDisabled();
    await user.type(input, "o");
    expect(button()).toBeEnabled();

    await user.click(button());
    expect(onConfirm).toHaveBeenCalledWith("klmno");
  });

  it("틀린 글자가 있으면 버튼이 꺼져 있고 Enter로도 실행되지 않는다", async () => {
    const user = userEvent.setup();
    const { input, button, onConfirm } = setup();
    await user.type(input, "KLMNX{Enter}");
    expect(button()).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("따라쓰기 오버레이: 맞은 글자는 진하게, 틀린 글자는 빨간색, 남은 글자는 회색으로 보인다", async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.type(input, "KX");
    const overlay = input.parentElement!.querySelector('[aria-hidden="true"]')!;
    const spans = Array.from(overlay.querySelectorAll("span"));
    expect(spans.map((s) => s.textContent).join("")).toBe("KXMNO");
    expect(spans[0].className).toContain("text-foreground");
    expect(spans[1].className).toContain("text-red-500");
    expect(spans[2].className).toContain("text-slate-300");
  });

  it("삭제 요청 중에는 입력과 버튼이 모두 잠긴다", () => {
    const { input } = setup({ isPurging: true });
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "삭제 중..." })).toBeDisabled();
  });
});
