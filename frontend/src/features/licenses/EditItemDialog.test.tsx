import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditItemDialog from "./EditItemDialog";
import { Item } from "../../types/item";

const versionOptions = {
  Windows: ["Windows 11 Pro", "Windows 10 Pro"],
  MS_Office: ["Office 2021 Professional Plus"],
};

const item: Item = {
  no: 3,
  key: "ABCDE-12345-FGHIJ-67890-KLMNO",
  member: "홍길동",
  category: "Windows",
  version: "Windows 10 Pro",
  memo: null,
};

const setup = (saveResult = true, target: Item = item) => {
  const onSave = vi.fn().mockResolvedValue(saveResult);
  const onClose = vi.fn();
  render(<EditItemDialog item={target} versionOptions={versionOptions} onSave={onSave} onClose={onClose} />);
  return { onSave, onClose, save: () => screen.getByRole("button", { name: "저장" }) };
};

describe("EditItemDialog", () => {
  it("현재 값으로 채워지고, 바뀐 게 없으면 저장 버튼이 꺼져 있다", () => {
    const { save } = setup();
    expect(screen.getByLabelText("사용자")).toHaveValue("홍길동");
    expect(screen.getByLabelText("메모")).toHaveValue("");
    expect(save()).toBeDisabled();
  });

  it("수정한 값을 앞뒤 공백 없이 저장하고, 성공하면 닫는다", async () => {
    const user = userEvent.setup();
    const { onSave, onClose, save } = setup();
    await user.clear(screen.getByLabelText("사용자"));
    await user.type(screen.getByLabelText("사용자"), "  김철수 ");
    await user.type(screen.getByLabelText("메모"), " 개발팀 PC-07 ");
    await user.click(save());

    expect(onSave).toHaveBeenCalledWith(3, {
      key: item.key,
      member: "김철수",
      category: "Windows",
      version: "Windows 10 Pro",
      memo: "개발팀 PC-07",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("사용자 칸에서 Enter로 저장한다", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    await user.type(screen.getByLabelText("사용자"), "2{Enter}");
    expect(onSave).toHaveBeenCalledWith(3, expect.objectContaining({ member: "홍길동2" }));
  });

  it("저장에 실패하면 입력값을 유지한 채 열어둔다", async () => {
    const user = userEvent.setup();
    const { onClose, save } = setup(false);
    await user.type(screen.getByLabelText("메모"), "메모");
    await user.click(save());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("메모")).toHaveValue("메모");
  });

  it("화이트리스트에 없는 과거 버전도 현재 값으로 보여주고, 다른 필드만 고쳐 저장할 수 있다", async () => {
    const user = userEvent.setup();
    const { onSave, save } = setup(true, { ...item, version: "Windows 8.1 Pro" });
    expect(screen.getByLabelText("버전 선택")).toHaveTextContent("Windows 8.1 Pro");
    await user.type(screen.getByLabelText("메모"), "구형 PC");
    await user.click(save());
    expect(onSave).toHaveBeenCalledWith(3, expect.objectContaining({ version: "Windows 8.1 Pro", memo: "구형 PC" }));
  });
});
