import React, { useState } from "react";
import { TextField, Button, Grid, Select, MenuItem } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const SearchComponent = ({ onSearch }) => {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("all"); // 선택된 카테고리 상태 관리

  const handleSearch = () => {
    console.log("카테고리:", category, "검색어:", content);
    onSearch(category, content); // 검색 로직을 호출하며 category와 content를 전달
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Grid
      container
      spacing={1}
      alignItems="center"
      justifyContent="center"
      style={{ marginBottom: "20px" }}
    >
      <Grid item xs={2} sm={2}>
        <Select
          fullWidth
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          displayEmpty
          variant="outlined"
          style={{ borderRadius: "8px", height: "40px" }}
        >
          <MenuItem value="all">전체</MenuItem>
          <MenuItem value="key">Key</MenuItem>
          <MenuItem value="member">사용자</MenuItem>
        </Select>
      </Grid>
      <Grid item xs={3} sm={2} md={5}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="검색어 입력"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            style: { borderRadius: "8px", height: "40px" },
          }}
        />
      </Grid>
      <Grid item xs={2} sm={1}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleSearch}
          startIcon={<SearchIcon />}
          style={{
            height: "40px",
            borderRadius: "8px",
            minWidth: "100px", // 최소 너비 설정
            whiteSpace: "nowrap", // 텍스트가 줄 바꿈 되지 않도록 설정
          }}
        >
          검색
        </Button>
      </Grid>
    </Grid>
  );
};

export default SearchComponent;
