/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/index.html", "./app/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          100: "#1C17FF",
          200: "#FAFF00",
          300: "#01004B",
          400: "#8CF1FF",
          500: "#DFECF9",
          600: "#808182",
          700: "#2B2B2B",
        },
      },
      fontSize: {
        sm12: ["12px", "14px"],
        base16: ["16px", "19px"],
        base18: ["18px", "22px"],
        lg20: ["20px", "24px"],
        xl42: ["42px", "51px"],
      },
      margin: {
        "30px": "30px",
        "38px": "38px",
        "11px": "11px",
        "82px": "82px",
        customFooter: "104px 0 61px",
      },
      padding: {
        customHeading: "42px 65px 33px",
        customHeadingMobile: "42px 20px 33px",
        customNavButtons: "32px 0 34px",
        "23px": "23px",
        customImageGrid: "20px 20px 0 20px",
        customIndexBtn: "10px 40px",
      },
      borderRadius: {
        "10px": "10px",
        "5px": "5px",
      },
    },
  },
  plugins: [],
};
