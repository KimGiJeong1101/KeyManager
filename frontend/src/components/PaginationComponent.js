// PaginationComponent.js
import React from "react";
import { Button, Grid } from "@mui/material";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardDoubleArrowLeft from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import KeyboardDoubleArrowRight from "@mui/icons-material/KeyboardDoubleArrowRight";

const PaginationComponent = ({
  currentPage,
  totalPages,
  pagesToShow,
  onPageChange,
}) => {
  // 현재 페이지 그룹의 첫 번째와 마지막 페이지 계산
  const currentGroupFirstPage =
    Math.floor((currentPage - 1) / pagesToShow) * pagesToShow + 1;
  const currentGroupLastPage = Math.min(
    currentGroupFirstPage + pagesToShow - 1,
    totalPages
  );

  return (
    <Grid
      container
      justifyContent="center"
      style={{ marginTop: "10px", marginBottom: "30px" }}
    >
      <Button
        disabled={currentPage === 1}
        onClick={() => onPageChange(1)}
        style={{ margin: "0 5px", width: "20px", minWidth: "20px" }}
      >
        <KeyboardDoubleArrowLeft fontSize="medium" />
      </Button>

      <Button
        disabled={currentPage === 1 && currentGroupFirstPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        style={{ margin: "0 5px", width: "20px", minWidth: "20px" }}
      >
        <KeyboardArrowLeft fontSize="medium" />
      </Button>

      {Array.from(
        { length: currentGroupLastPage - currentGroupFirstPage + 1 },
        (_, index) => {
          const pageNum = currentGroupFirstPage + index;
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "contained" : "outlined"}
              onClick={() => onPageChange(pageNum)}
              style={{ margin: "0 5px", width: "20px", minWidth: "20px" }}
            >
              {pageNum}
            </Button>
          );
        }
      )}

      <Button
        disabled={
          currentGroupLastPage === totalPages && currentPage === totalPages
        }
        onClick={() => onPageChange(currentPage + 1)}
        style={{ margin: "0 5px", width: "20px", minWidth: "20px" }}
      >
        <KeyboardArrowRight fontSize="medium" />
      </Button>

      <Button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
        style={{ margin: "0 5px", width: "20px", minWidth: "20px" }}
      >
        <KeyboardDoubleArrowRight fontSize="medium" />
      </Button>
    </Grid>
  );
};

export default PaginationComponent;
