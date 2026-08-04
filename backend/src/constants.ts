// 라이선스 등록 시 허용되는 category/version 화이트리스트.
// frontend/src/features/licenses/ItemList.tsx의 VERSION_OPTIONS와 동일하게 유지한다.

export const VERSION_OPTIONS: Record<string, string[]> = {
  Windows: [
    "Windows 11 Pro",
    "Windows 11 Home",
    "Windows 11 Enterprise",
    "Windows 10 Pro",
    "Windows 10 Home",
    "Windows 10 Enterprise",
    "Windows 8.1 Pro",
    "Windows 7 Professional",
    "Windows 7 Ultimate",
    "Windows Server 2022 Standard",
    "Windows Server 2019 Standard",
    "Windows Server 2016 Standard",
    "Windows Server 2012 R2",
    "Windows Server 2008 R2",
  ],
  MS_Office: [
    "Microsoft 365 Business",
    "Microsoft 365 Apps for Enterprise",
    "Office 2021 Professional Plus",
    "Office 2019 Professional Plus",
    "Office 2016 Professional Plus",
    "Office 2013 Professional",
    "Office 2010 Professional Plus",
    "Office 2007 Standard",
  ],
  Hancom: [
    "한컴오피스 2024",
    "한컴오피스 2022",
    "한컴오피스 2020",
    "한컴오피스 2018",
    "한컴오피스 2014 VP",
    "한컴오피스 2010 SE",
    "한컴오피스 한글 2010",
    "한컴오피스 한글 2007",
  ],
};

export const CATEGORIES = Object.keys(VERSION_OPTIONS);
