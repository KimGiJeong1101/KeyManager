import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Container, TextField, Button, Grid, Typography } from "@mui/material";
import ItemListDisplay from "./ItemListDisplay";
import PaginationComponent from "./PaginationComponent"; // 새로 만든 컴포넌트 불러오기
import SearchComponent from "./SearchComponent";

const ItemList = () => {
  const [items, setItems] = useState([]);
  const [keys, setKeys] = useState(["", "", "", "", ""]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const pagesToShow = 5;

  const [searchCategory, setSearchCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const inputRefs = useRef([]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const fetchItems = async (page) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/items?page=${page}&limit=${itemsPerPage}`
      );
      setItems(response.data.items);
      setTotalItems(response.data.total);

      if (response.data.items.length === 0) {
        alert("가져올 데이터가 없습니다.");
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      alert("가져올 데이터가 없습니다.");
    }
  };

  useEffect(() => {
    fetchItems(currentPage);
  }, [currentPage]);

  const addItems = async () => {
    if (keys.some((key) => key.length === 0)) {
      alert("모든 입력란을 채워주세요.");
      return;
    }
    if (!keys.every((key) => key.length === 5)) {
      alert("각 입력란은 정확히 5글자여야 합니다.");
      return;
    }
    const combinedKey = keys.join("-");

    try {
      const response = await axios.post("http://localhost:5000/items", {
        key: combinedKey,
      });
      setItems([...items, response.data]);
      setKeys(["", "", "", "", ""]);
      fetchItems(currentPage);
      alert("등록이 완료되었습니다");
    } catch (error) {
      if (error.response && error.response.data.error) {
        alert(error.response.data.error);
      } else {
        console.error("Error adding item:", error);
      }
    }
  };

  const updateItem = async (no, key, member) => {
    console.log("업데이트 함수 호출됨:", no, key, member);
    try {
      const response = await axios.put(`http://localhost:5000/items/${no}`, {
        key,
        member,
      });
      setItems(items.map((item) => (item.no === no ? response.data : item)));
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const deleteItem = async (no) => {
    const confirmed = window.confirm("삭제하시겠습니까?");
    if (confirmed) {
      await axios.delete(`http://localhost:5000/items/${no}`);
      fetchItems(currentPage);
    }
  };

  const handleChange = (index, value) => {
    const regex = /^[A-Za-z0-9]{0,5}$/;
    if (!regex.test(value)) {
      alert("숫자와 영어만 입력하세요");
      return;
    }
    const updatedKeys = [...keys];
    updatedKeys[index] = value.toUpperCase();
    setKeys(updatedKeys);
    if (value.length === 5 && index < keys.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      addItems();
    }
  };

  // 검색 버튼 클릭 시 검색을 적용
  const handleSearch = (category, search) => {
    // "all"일 경우 빈 문자열로 처리
    const effectiveCategory = category === "all" ? "" : category;
    setSearchCategory(effectiveCategory);
    setSearchTerm(search);
    setCurrentPage(1); // 검색 시 첫 페이지로 리셋
    SearchItems(1, effectiveCategory, search); // 검색 후 첫 페이지를 호출
  };

  // API 호출 수정
  const SearchItems = async (page, category = "", search = "") => {
    const url = `http://localhost:5000/search-items?page=${page}&limit=${itemsPerPage}&category=${category}&search=${search}`;
    console.log("검색 URL:", url); // URL 확인
    try {
      const response = await axios.get(url);
      setItems(response.data.items);
      setTotalItems(response.data.total);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  // useEffect에서 검색 조건을 반영하여 데이터를 가져옴
  useEffect(() => {
    if (searchCategory || searchTerm) {
      SearchItems(currentPage, searchCategory, searchTerm);
    } else {
      fetchItems(currentPage); // 검색이 없으면 기본 항목 가져오기
    }
  }, [currentPage, searchCategory, searchTerm]); // 페이지, 카테고리, 검색어가 변경되면 새로 불러오기

  return (
    <Container maxWidth="lg">
      <h1>Windows10 KEY</h1>
      <Grid container alignItems="center" spacing={1}>
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <Grid item>
              <TextField
                variant="outlined"
                value={key}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={handleKeyDown}
                inputProps={{
                  maxLength: 5,
                  pattern: "[A-Za-z0-9]*",
                  title: "영어와 숫자만 입력할 수 있습니다.",
                }}
                style={{ width: "150px", height: "50px" }}
                InputProps={{ style: { height: "50px" } }}
                inputRef={(el) => (inputRefs.current[index] = el)}
              />
            </Grid>
            {index < keys.length - 1 && (
              <Grid item>
                <Typography variant="h6">-</Typography>
              </Grid>
            )}
          </React.Fragment>
        ))}
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={addItems}
            style={{ marginLeft: "8px" }}
          >
            등록하기
          </Button>
        </Grid>
      </Grid>
      <ItemListDisplay
        items={items}
        deleteItem={deleteItem}
        updateItem={updateItem}
      />

      <SearchComponent onSearch={handleSearch}></SearchComponent>

      {/* PaginationComponent 사용 */}
      <PaginationComponent
        currentPage={currentPage}
        totalPages={totalPages}
        pagesToShow={pagesToShow}
        onPageChange={setCurrentPage}
      />
    </Container>
  );
};

export default ItemList;
