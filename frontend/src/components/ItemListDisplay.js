// src/components/ItemListDisplay.js (Updated)

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Paper,
  TextField,
  Box,
  IconButton,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close"; // Close 아이콘 추가

const ItemListDisplay = ({ items, deleteItem, updateItem }) => {
  const [editMode, setEditMode] = useState(null); // 현재 수정 중인 항목의 no 값
  const [editKey, setEditKey] = useState(""); // 수정 중인 key 값
  const [editMember, setEditMember] = useState(""); // 수정 중인 Member 값

  const handleEdit = (item) => {
    setEditMode(item.no); // 수정할 항목의 no 값으로 editMode 설정
    setEditKey(item.key); // 기존 key 값을 인풋 필드에 설정
    setEditMember(item.member || ""); // 기존 Member 값을 인풋 필드에 설정
  };

  const handleSave = () => {
    updateItem(editMode, editKey, editMember); // 부모 컴포넌트로 수정 사항 저장 요청
    setEditMode(null); // 수정 모드 해제
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSave();
    }
  };

  return (
    <TableContainer
      component={Paper}
      style={{
        marginTop: "32px",
        padding: "16px",
        marginBottom: "32px",
        border: "8px solid #f0f0f0",
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell
              style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}
            >
              No.
            </TableCell>
            <TableCell
              align="center"
              style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}
            >
              Key
            </TableCell>
            <TableCell
              align="center"
              style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}
            >
              사용자
            </TableCell>
            <TableCell
              align="center"
              style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}
            >
              수정
            </TableCell>
            <TableCell
              align="center"
              style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}
            >
              삭제
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.no} hover>
              <TableCell
                style={{
                  fontSize: "16px",
                  color:
                    item.member && item.member !== "사용자없음"
                      ? "#a4a4a4"
                      : "inherit",
                }}
              >
                {item.no}.
              </TableCell>
              {/* 수정 모드일 때 인풋 필드, 아닐 때 텍스트 */}
              <TableCell
                align="center"
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color:
                    item.member && item.member !== "사용자없음"
                      ? "#a4a4a4"
                      : "inherit",
                }} // 원하는 크기와 두께로 조정
              >
                {item.key}
              </TableCell>

              <TableCell
                align="center"
                style={{
                  fontSize: "16px",
                  color:
                    item.member && item.member !== "사용자없음"
                      ? "#a4a4a4"
                      : "inherit",
                }}
              >
                {editMode === item.no ? (
                  <Box display="flex" alignItems="center">
                    <TextField
                      value={editMember}
                      onChange={(e) => setEditMember(e.target.value)}
                      onKeyDown={handleKeyDown}
                      size="small" // 인풋 크기 조절
                    />
                    <IconButton
                      color="inherit" // 기본 아이콘 색상
                      size="small" // 아이콘 크기 조절
                      style={{ marginLeft: "8px" }} // 인풋과 아이콘 사이 간격 조절
                      onClick={() => {
                        setEditMode(null); // 수정 모드 해제
                        console.log("닫기 아이콘 클릭!"); // 로그 출력
                      }}
                    >
                      <CloseIcon /> {/* 닫기 아이콘 */}
                    </IconButton>
                  </Box>
                ) : (
                  item.member || "사용자없음"
                )}
              </TableCell>
              <TableCell align="center">
                {editMode === item.no ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                  >
                    저장
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleEdit(item)}
                  >
                    수정
                  </Button>
                )}
              </TableCell>
              <TableCell align="center">
                <Button
                  disabled={item.member && item.member !== "사용자없음"}
                  variant="outlined"
                  color="secondary"
                  onClick={() => deleteItem(item.no)}
                >
                  삭제
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ItemListDisplay;
