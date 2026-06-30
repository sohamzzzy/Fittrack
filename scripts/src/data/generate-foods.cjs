const fs = require('fs');

const indianFoods = [
  // North Indian
  { name: "Butter Chicken", calories: "400", protein: "25", carbs: "12", fats: "28", servingSize: "1", servingUnit: "cup" },
  { name: "Chicken Tikka Masala", calories: "380", protein: "28", carbs: "14", fats: "24", servingSize: "1", servingUnit: "cup" },
  { name: "Palak Paneer", calories: "320", protein: "15", carbs: "10", fats: "25", servingSize: "1", servingUnit: "cup" },
  { name: "Paneer Butter Masala", calories: "420", protein: "16", carbs: "15", fats: "32", servingSize: "1", servingUnit: "cup" },
  { name: "Chana Masala", calories: "260", protein: "10", carbs: "35", fats: "8", servingSize: "1", servingUnit: "cup" },
  { name: "Rajma Chawal", calories: "350", protein: "12", carbs: "60", fats: "6", servingSize: "1", servingUnit: "plate" },
  { name: "Chole Bhature", calories: "550", protein: "14", carbs: "65", fats: "26", servingSize: "2", servingUnit: "bhature + 1 cup chole" },
  { name: "Dal Makhani", calories: "310", protein: "11", carbs: "30", fats: "16", servingSize: "1", servingUnit: "cup" },
  { name: "Dal Tadka", calories: "220", protein: "12", carbs: "30", fats: "6", servingSize: "1", servingUnit: "cup" },
  { name: "Aloo Gobi", calories: "150", protein: "4", carbs: "22", fats: "6", servingSize: "1", servingUnit: "cup" },
  { name: "Bhindi Masala", calories: "120", protein: "3", carbs: "12", fats: "7", servingSize: "1", servingUnit: "cup" },
  { name: "Malai Kofta", calories: "450", protein: "10", carbs: "35", fats: "30", servingSize: "1", servingUnit: "cup" },
  { name: "Naan (Plain)", calories: "260", protein: "8", carbs: "45", fats: "4", servingSize: "1", servingUnit: "piece" },
  { name: "Garlic Naan", calories: "290", protein: "8", carbs: "46", fats: "8", servingSize: "1", servingUnit: "piece" },
  { name: "Butter Naan", calories: "310", protein: "8", carbs: "45", fats: "10", servingSize: "1", servingUnit: "piece" },
  { name: "Tandoori Roti", calories: "110", protein: "4", carbs: "22", fats: "1", servingSize: "1", servingUnit: "piece" },
  { name: "Aloo Paratha (with butter)", calories: "320", protein: "6", carbs: "42", fats: "14", servingSize: "1", servingUnit: "paratha" },
  { name: "Paneer Paratha", calories: "340", protein: "12", carbs: "38", fats: "16", servingSize: "1", servingUnit: "paratha" },
  { name: "Gobi Paratha", calories: "280", protein: "6", carbs: "40", fats: "10", servingSize: "1", servingUnit: "paratha" },
  { name: "Puri", calories: "140", protein: "2", carbs: "15", fats: "8", servingSize: "1", servingUnit: "piece" },
  
  // South Indian
  { name: "Masala Dosa", calories: "415", protein: "9", carbs: "65", fats: "13", servingSize: "1", servingUnit: "dosa" },
  { name: "Plain Dosa", calories: "160", protein: "4", carbs: "28", fats: "4", servingSize: "1", servingUnit: "dosa" },
  { name: "Idli", calories: "40", protein: "1.5", carbs: "8", fats: "0.2", servingSize: "1", servingUnit: "piece" },
  { name: "Medu Vada", calories: "97", protein: "3", carbs: "12", fats: "4.5", servingSize: "1", servingUnit: "piece" },
  { name: "Sambar", calories: "130", protein: "6", carbs: "20", fats: "4", servingSize: "1", servingUnit: "cup" },
  { name: "Coconut Chutney", calories: "70", protein: "1", carbs: "3", fats: "6", servingSize: "2", servingUnit: "tbsp" },
  { name: "Upma", calories: "220", protein: "6", carbs: "35", fats: "6", servingSize: "1", servingUnit: "cup" },
  { name: "Uttapam", calories: "180", protein: "5", carbs: "30", fats: "4", servingSize: "1", servingUnit: "piece" },
  { name: "Lemon Rice", calories: "250", protein: "4", carbs: "40", fats: "8", servingSize: "1", servingUnit: "cup" },
  { name: "Curd Rice", calories: "210", protein: "6", carbs: "32", fats: "6", servingSize: "1", servingUnit: "cup" },
  { name: "Bisi Bele Bath", calories: "310", protein: "9", carbs: "50", fats: "9", servingSize: "1", servingUnit: "cup" },
  { name: "Appam", calories: "110", protein: "2", carbs: "22", fats: "1", servingSize: "1", servingUnit: "piece" },
  
  // Maharashtrian & Gujarati
  { name: "Misal Pav", calories: "450", protein: "14", carbs: "55", fats: "20", servingSize: "1", servingUnit: "plate" },
  { name: "Vada Pav", calories: "300", protein: "6", carbs: "42", fats: "12", servingSize: "1", servingUnit: "piece" },
  { name: "Poha", calories: "260", protein: "5", carbs: "45", fats: "6", servingSize: "1", servingUnit: "cup" },
  { name: "Sabudana Khichdi", calories: "350", protein: "3", carbs: "60", fats: "12", servingSize: "1", servingUnit: "cup" },
  { name: "Pav Bhaji", calories: "400", protein: "8", carbs: "52", fats: "18", servingSize: "1", servingUnit: "plate" },
  { name: "Puran Poli", calories: "290", protein: "7", carbs: "50", fats: "8", servingSize: "1", servingUnit: "piece" },
  { name: "Dhokla", calories: "160", protein: "6", carbs: "22", fats: "4", servingSize: "3", servingUnit: "pieces" },
  { name: "Khandvi", calories: "210", protein: "8", carbs: "26", fats: "9", servingSize: "1", servingUnit: "cup" },
  { name: "Thepla", calories: "110", protein: "3", carbs: "16", fats: "4", servingSize: "1", servingUnit: "piece" },
  { name: "Undhiyu", calories: "240", protein: "6", carbs: "28", fats: "12", servingSize: "1", servingUnit: "cup" },
  { name: "Shrikhand", calories: "280", protein: "8", carbs: "40", fats: "10", servingSize: "1", servingUnit: "cup" },

  // Bengali & Eastern
  { name: "Fish Curry (Rohu)", calories: "220", protein: "20", carbs: "8", fats: "12", servingSize: "1", servingUnit: "cup" },
  { name: "Kosha Mangsho (Mutton Curry)", calories: "450", protein: "25", carbs: "12", fats: "32", servingSize: "1", servingUnit: "cup" },
  { name: "Shorshe Ilish", calories: "350", protein: "18", carbs: "6", fats: "28", servingSize: "1", servingUnit: "piece with gravy" },
  { name: "Luchi", calories: "120", protein: "2", carbs: "14", fats: "6", servingSize: "1", servingUnit: "piece" },
  { name: "Cholar Dal", calories: "180", protein: "8", carbs: "26", fats: "5", servingSize: "1", servingUnit: "cup" },
  { name: "Rosogolla", calories: "150", protein: "3", carbs: "30", fats: "1", servingSize: "2", servingUnit: "pieces" },
  { name: "Sandesh", calories: "120", protein: "4", carbs: "15", fats: "5", servingSize: "2", servingUnit: "pieces" },
  { name: "Mishti Doi", calories: "200", protein: "6", carbs: "28", fats: "7", servingSize: "1", servingUnit: "cup" },

  // Rice & Biryani
  { name: "Chicken Biryani", calories: "480", protein: "22", carbs: "60", fats: "16", servingSize: "1", servingUnit: "cup" },
  { name: "Mutton Biryani", calories: "550", protein: "24", carbs: "58", fats: "24", servingSize: "1", servingUnit: "cup" },
  { name: "Veg Biryani", calories: "320", protein: "8", carbs: "52", fats: "10", servingSize: "1", servingUnit: "cup" },
  { name: "Egg Biryani", calories: "380", protein: "14", carbs: "54", fats: "12", servingSize: "1", servingUnit: "cup" },
  { name: "Jeera Rice", calories: "220", protein: "4", carbs: "42", fats: "4", servingSize: "1", servingUnit: "cup" },
  { name: "Peas Pulao", calories: "240", protein: "6", carbs: "44", fats: "4", servingSize: "1", servingUnit: "cup" },
  { name: "Khichdi (Moong Dal)", calories: "210", protein: "8", carbs: "36", fats: "4", servingSize: "1", servingUnit: "cup" },

  // Street Food & Snacks
  { name: "Pani Puri / Golgappa", calories: "150", protein: "3", carbs: "25", fats: "4", servingSize: "6", servingUnit: "pieces" },
  { name: "Samosa", calories: "260", protein: "4", carbs: "32", fats: "14", servingSize: "1", servingUnit: "piece" },
  { name: "Kachori", calories: "290", protein: "5", carbs: "30", fats: "16", servingSize: "1", servingUnit: "piece" },
  { name: "Bhel Puri", calories: "250", protein: "5", carbs: "48", fats: "5", servingSize: "1", servingUnit: "plate" },
  { name: "Aloo Tikki", calories: "220", protein: "3", carbs: "30", fats: "10", servingSize: "2", servingUnit: "pieces" },
  { name: "Dahi Vada", calories: "180", protein: "6", carbs: "24", fats: "6", servingSize: "2", servingUnit: "pieces" },
  { name: "Pakora (Mixed Veg)", calories: "250", protein: "6", carbs: "22", fats: "16", servingSize: "5", servingUnit: "pieces" },
  { name: "Onion Bhaji", calories: "210", protein: "5", carbs: "20", fats: "12", servingSize: "4", servingUnit: "pieces" },
  
  // Desserts & Sweets
  { name: "Gulab Jamun", calories: "300", protein: "4", carbs: "45", fats: "10", servingSize: "2", servingUnit: "pieces" },
  { name: "Jalebi", calories: "300", protein: "2", carbs: "55", fats: "8", servingSize: "3", servingUnit: "pieces" },
  { name: "Kheer (Rice Pudding)", calories: "220", protein: "6", carbs: "35", fats: "6", servingSize: "1", servingUnit: "cup" },
  { name: "Gajar Ka Halwa", calories: "320", protein: "6", carbs: "40", fats: "16", servingSize: "1", servingUnit: "cup" },
  { name: "Rasmalai", calories: "250", protein: "8", carbs: "30", fats: "12", servingSize: "2", servingUnit: "pieces" },
  { name: "Ladoo (Besan)", calories: "220", protein: "4", carbs: "28", fats: "11", servingSize: "1", servingUnit: "piece" },
  { name: "Barfi (Kaju Katli)", calories: "160", protein: "3", carbs: "18", fats: "9", servingSize: "3", servingUnit: "pieces" },
  { name: "Mysore Pak", calories: "250", protein: "2", carbs: "30", fats: "15", servingSize: "1", servingUnit: "piece" }
];

const internationalFoods = [
  // American
  { name: "Cheeseburger", calories: "550", protein: "28", carbs: "45", fats: "30", servingSize: "1", servingUnit: "burger" },
  { name: "French Fries (Medium)", calories: "365", protein: "4", carbs: "48", fats: "17", servingSize: "1", servingUnit: "order" },
  { name: "Hot Dog", calories: "300", protein: "10", carbs: "25", fats: "18", servingSize: "1", servingUnit: "hot dog" },
  { name: "Fried Chicken (Breast)", calories: "400", protein: "32", carbs: "14", fats: "22", servingSize: "1", servingUnit: "piece" },
  { name: "Pizza (Pepperoni, 1 slice)", calories: "280", protein: "12", carbs: "30", fats: "12", servingSize: "1", servingUnit: "slice" },
  { name: "Macaroni and Cheese", calories: "450", protein: "16", carbs: "48", fats: "20", servingSize: "1", servingUnit: "cup" },
  { name: "Steak (Ribeye, 8oz)", calories: "650", protein: "50", carbs: "0", fats: "48", servingSize: "8", servingUnit: "oz" },
  
  // Italian
  { name: "Spaghetti Bolognese", calories: "500", protein: "25", carbs: "60", fats: "18", servingSize: "1", servingUnit: "plate" },
  { name: "Lasagna", calories: "600", protein: "30", carbs: "45", fats: "32", servingSize: "1", servingUnit: "piece" },
  { name: "Fettuccine Alfredo", calories: "650", protein: "20", carbs: "55", fats: "38", servingSize: "1", servingUnit: "plate" },
  { name: "Margherita Pizza (1 slice)", calories: "220", protein: "10", carbs: "28", fats: "8", servingSize: "1", servingUnit: "slice" },
  { name: "Ravioli (Cheese)", calories: "350", protein: "15", carbs: "42", fats: "14", servingSize: "1", servingUnit: "cup" },
  { name: "Minestrone Soup", calories: "150", protein: "6", carbs: "25", fats: "4", servingSize: "1", servingUnit: "bowl" },
  { name: "Tiramisu", calories: "450", protein: "8", carbs: "42", fats: "28", servingSize: "1", servingUnit: "piece" },

  // Mexican
  { name: "Chicken Taco", calories: "200", protein: "15", carbs: "18", fats: "8", servingSize: "1", servingUnit: "taco" },
  { name: "Beef Burrito", calories: "700", protein: "35", carbs: "75", fats: "30", servingSize: "1", servingUnit: "burrito" },
  { name: "Cheese Enchilada", calories: "320", protein: "14", carbs: "30", fats: "18", servingSize: "1", servingUnit: "enchilada" },
  { name: "Guacamole", calories: "180", protein: "2", carbs: "10", fats: "16", servingSize: "1/4", servingUnit: "cup" },
  { name: "Tortilla Chips", calories: "140", protein: "2", carbs: "18", fats: "7", servingSize: "1", servingUnit: "oz" },
  { name: "Quesadilla (Chicken)", calories: "500", protein: "30", carbs: "40", fats: "25", servingSize: "1", servingUnit: "quesadilla" },
  { name: "Fajitas (Beef)", calories: "450", protein: "32", carbs: "35", fats: "20", servingSize: "1", servingUnit: "plate" },

  // Chinese
  { name: "Kung Pao Chicken", calories: "420", protein: "28", carbs: "20", fats: "25", servingSize: "1", servingUnit: "cup" },
  { name: "Sweet and Sour Pork", calories: "550", protein: "20", carbs: "60", fats: "25", servingSize: "1", servingUnit: "cup" },
  { name: "Fried Rice (Chicken)", calories: "350", protein: "14", carbs: "45", fats: "12", servingSize: "1", servingUnit: "cup" },
  { name: "Chow Mein", calories: "400", protein: "12", carbs: "55", fats: "15", servingSize: "1", servingUnit: "cup" },
  { name: "Spring Roll", calories: "120", protein: "3", carbs: "14", fats: "6", servingSize: "1", servingUnit: "piece" },
  { name: "Dim Sum (Har Gow)", calories: "45", protein: "3", carbs: "6", fats: "1", servingSize: "1", servingUnit: "piece" },
  { name: "Peking Duck", calories: "320", protein: "18", carbs: "2", fats: "26", servingSize: "3", servingUnit: "oz" },

  // Japanese & Korean
  { name: "Sushi (Salmon Nigiri)", calories: "60", protein: "4", carbs: "8", fats: "1", servingSize: "1", servingUnit: "piece" },
  { name: "California Roll", calories: "250", protein: "8", carbs: "38", fats: "7", servingSize: "6", servingUnit: "pieces" },
  { name: "Ramen (Tonkotsu)", calories: "600", protein: "25", carbs: "70", fats: "25", servingSize: "1", servingUnit: "bowl" },
  { name: "Chicken Teriyaki", calories: "300", protein: "28", carbs: "25", fats: "8", servingSize: "1", servingUnit: "cup" },
  { name: "Miso Soup", calories: "40", protein: "3", carbs: "4", fats: "1", servingSize: "1", servingUnit: "bowl" },
  { name: "Bibimbap", calories: "550", protein: "22", carbs: "75", fats: "18", servingSize: "1", servingUnit: "bowl" },
  { name: "Kimchi", calories: "20", protein: "1", carbs: "4", fats: "0", servingSize: "1/2", servingUnit: "cup" },
  { name: "Korean Fried Chicken", calories: "350", protein: "20", carbs: "22", fats: "20", servingSize: "3", servingUnit: "pieces" },

  // Thai
  { name: "Pad Thai", calories: "450", protein: "18", carbs: "65", fats: "14", servingSize: "1", servingUnit: "cup" },
  { name: "Green Curry (Chicken)", calories: "380", protein: "25", carbs: "12", fats: "26", servingSize: "1", servingUnit: "cup" },
  { name: "Tom Yum Soup", calories: "120", protein: "12", carbs: "8", fats: "4", servingSize: "1", servingUnit: "bowl" },
  { name: "Mango Sticky Rice", calories: "350", protein: "4", carbs: "65", fats: "10", servingSize: "1", servingUnit: "portion" },

  // Mediterranean & Middle Eastern
  { name: "Hummus", calories: "170", protein: "4", carbs: "16", fats: "10", servingSize: "1/4", servingUnit: "cup" },
  { name: "Falafel", calories: "330", protein: "14", carbs: "32", fats: "18", servingSize: "3", servingUnit: "pieces" },
  { name: "Chicken Shawarma", calories: "400", protein: "30", carbs: "15", fats: "22", servingSize: "1", servingUnit: "wrap/pita" },
  { name: "Tabbouleh", calories: "150", protein: "4", carbs: "20", fats: "8", servingSize: "1", servingUnit: "cup" },
  { name: "Baba Ganoush", calories: "120", protein: "2", carbs: "10", fats: "8", servingSize: "1/4", servingUnit: "cup" },
  { name: "Greek Salad", calories: "250", protein: "8", carbs: "12", fats: "20", servingSize: "1", servingUnit: "bowl" }
];

const generalFoods = [
  // Fruits
  { name: "Apple", calories: "95", protein: "0.5", carbs: "25", fats: "0.3", servingSize: "1", servingUnit: "medium" },
  { name: "Banana", calories: "105", protein: "1.3", carbs: "27", fats: "0.4", servingSize: "1", servingUnit: "medium" },
  { name: "Orange", calories: "62", protein: "1.2", carbs: "15", fats: "0.2", servingSize: "1", servingUnit: "medium" },
  { name: "Strawberries", calories: "49", protein: "1", carbs: "12", fats: "0.5", servingSize: "1", servingUnit: "cup" },
  { name: "Blueberries", calories: "84", protein: "1", carbs: "21", fats: "0.5", servingSize: "1", servingUnit: "cup" },
  { name: "Grapes", calories: "104", protein: "1.1", carbs: "27", fats: "0.2", servingSize: "1", servingUnit: "cup" },
  { name: "Mango", calories: "202", protein: "2.8", carbs: "50", fats: "1.3", servingSize: "1", servingUnit: "fruit" },
  { name: "Pineapple", calories: "82", protein: "0.9", carbs: "22", fats: "0.2", servingSize: "1", servingUnit: "cup" },
  { name: "Watermelon", calories: "46", protein: "0.9", carbs: "11", fats: "0.2", servingSize: "1", servingUnit: "cup" },
  { name: "Avocado", calories: "234", protein: "2.9", carbs: "12", fats: "21", servingSize: "1", servingUnit: "medium" },

  // Vegetables
  { name: "Broccoli (Raw)", calories: "31", protein: "2.6", carbs: "6", fats: "0.3", servingSize: "1", servingUnit: "cup" },
  { name: "Spinach (Raw)", calories: "7", protein: "0.9", carbs: "1.1", fats: "0.1", servingSize: "1", servingUnit: "cup" },
  { name: "Carrot (Raw)", calories: "41", protein: "0.9", carbs: "10", fats: "0.2", servingSize: "1", servingUnit: "medium" },
  { name: "Tomato", calories: "22", protein: "1.1", carbs: "4.8", fats: "0.2", servingSize: "1", servingUnit: "medium" },
  { name: "Cucumber", calories: "16", protein: "0.7", carbs: "3.8", fats: "0.1", servingSize: "1", servingUnit: "medium" },
  { name: "Bell Pepper", calories: "24", protein: "1", carbs: "6", fats: "0.3", servingSize: "1", servingUnit: "medium" },
  { name: "Onion", calories: "44", protein: "1.2", carbs: "10", fats: "0.1", servingSize: "1", servingUnit: "medium" },
  { name: "Potato (Baked)", calories: "161", protein: "4.3", carbs: "37", fats: "0.2", servingSize: "1", servingUnit: "medium" },
  { name: "Sweet Potato (Baked)", calories: "103", protein: "2.3", carbs: "24", fats: "0.2", servingSize: "1", servingUnit: "medium" },
  { name: "Cauliflower (Raw)", calories: "25", protein: "2", carbs: "5", fats: "0.3", servingSize: "1", servingUnit: "cup" },
  
  // Meats & Seafood
  { name: "Chicken Breast (Cooked)", calories: "165", protein: "31", carbs: "0", fats: "3.6", servingSize: "100", servingUnit: "g" },
  { name: "Chicken Thigh (Cooked)", calories: "209", protein: "26", carbs: "0", fats: "11", servingSize: "100", servingUnit: "g" },
  { name: "Ground Beef (90% Lean, Cooked)", calories: "214", protein: "27", carbs: "0", fats: "11", servingSize: "100", servingUnit: "g" },
  { name: "Salmon (Cooked)", calories: "206", protein: "22", carbs: "0", fats: "12", servingSize: "100", servingUnit: "g" },
  { name: "Tuna (Canned in Water)", calories: "116", protein: "26", carbs: "0", fats: "0.8", servingSize: "1", servingUnit: "can (165g)" },
  { name: "Turkey Breast (Sliced)", calories: "104", protein: "22", carbs: "2", fats: "1.6", servingSize: "100", servingUnit: "g" },
  { name: "Pork Chop (Cooked)", calories: "250", protein: "25", carbs: "0", fats: "16", servingSize: "100", servingUnit: "g" },
  { name: "Shrimp (Cooked)", calories: "99", protein: "24", carbs: "0.2", fats: "0.3", servingSize: "100", servingUnit: "g" },
  { name: "Bacon", calories: "43", protein: "3", carbs: "0.1", fats: "3.3", servingSize: "1", servingUnit: "slice" },
  
  // Dairy & Eggs
  { name: "Egg (Large)", calories: "78", protein: "6.3", carbs: "0.6", fats: "5.3", servingSize: "1", servingUnit: "egg" },
  { name: "Egg White", calories: "17", protein: "3.6", carbs: "0.2", fats: "0.1", servingSize: "1", servingUnit: "large" },
  { name: "Whole Milk", calories: "149", protein: "8", carbs: "12", fats: "8", servingSize: "1", servingUnit: "cup" },
  { name: "Skim Milk", calories: "83", protein: "8.3", carbs: "12.2", fats: "0.2", servingSize: "1", servingUnit: "cup" },
  { name: "Greek Yogurt (Nonfat)", calories: "100", protein: "17", carbs: "6", fats: "0.7", servingSize: "170", servingUnit: "g" },
  { name: "Cheddar Cheese", calories: "113", protein: "7", carbs: "0.4", fats: "9", servingSize: "1", servingUnit: "oz" },
  { name: "Mozzarella (Part Skim)", calories: "72", protein: "7", carbs: "0.8", fats: "4.5", servingSize: "1", servingUnit: "oz" },
  { name: "Paneer", calories: "265", protein: "18", carbs: "3", fats: "20", servingSize: "100", servingUnit: "g" },
  { name: "Butter", calories: "102", protein: "0.1", carbs: "0", fats: "11.5", servingSize: "1", servingUnit: "tbsp" },
  
  // Grains & Legumes
  { name: "White Rice (Cooked)", calories: "205", protein: "4.3", carbs: "45", fats: "0.4", servingSize: "1", servingUnit: "cup" },
  { name: "Brown Rice (Cooked)", calories: "216", protein: "5", carbs: "45", fats: "1.8", servingSize: "1", servingUnit: "cup" },
  { name: "Quinoa (Cooked)", calories: "222", protein: "8", carbs: "39", fats: "3.6", servingSize: "1", servingUnit: "cup" },
  { name: "Oatmeal (Cooked)", calories: "158", protein: "6", carbs: "27", fats: "3.2", servingSize: "1", servingUnit: "cup" },
  { name: "Whole Wheat Bread", calories: "69", protein: "3.6", carbs: "12", fats: "0.9", servingSize: "1", servingUnit: "slice" },
  { name: "White Bread", calories: "79", protein: "2.7", carbs: "15", fats: "1", servingSize: "1", servingUnit: "slice" },
  { name: "Pasta (Cooked)", calories: "220", protein: "8", carbs: "43", fats: "1.3", servingSize: "1", servingUnit: "cup" },
  { name: "Lentils (Cooked)", calories: "230", protein: "18", carbs: "40", fats: "0.8", servingSize: "1", servingUnit: "cup" },
  { name: "Black Beans (Cooked)", calories: "227", protein: "15", carbs: "41", fats: "0.9", servingSize: "1", servingUnit: "cup" },
  { name: "Chickpeas (Cooked)", calories: "269", protein: "15", carbs: "45", fats: "4.2", servingSize: "1", servingUnit: "cup" },
  
  // Nuts, Seeds & Oils
  { name: "Almonds", calories: "164", protein: "6", carbs: "6", fats: "14", servingSize: "1", servingUnit: "oz" },
  { name: "Walnuts", calories: "185", protein: "4.3", carbs: "3.9", fats: "18.5", servingSize: "1", servingUnit: "oz" },
  { name: "Peanuts", calories: "161", protein: "7.3", carbs: "4.6", fats: "14", servingSize: "1", servingUnit: "oz" },
  { name: "Peanut Butter", calories: "188", protein: "8", carbs: "6", fats: "16", servingSize: "2", servingUnit: "tbsp" },
  { name: "Chia Seeds", calories: "138", protein: "4.7", carbs: "12", fats: "8.7", servingSize: "1", servingUnit: "oz" },
  { name: "Olive Oil", calories: "119", protein: "0", carbs: "0", fats: "13.5", servingSize: "1", servingUnit: "tbsp" },
  { name: "Coconut Oil", calories: "117", protein: "0", carbs: "0", fats: "13.6", servingSize: "1", servingUnit: "tbsp" },

  // Drinks & Misc
  { name: "Whey Protein Powder", calories: "120", protein: "24", carbs: "3", fats: "1.5", servingSize: "1", servingUnit: "scoop" },
  { name: "Orange Juice", calories: "112", protein: "1.7", carbs: "26", fats: "0.5", servingSize: "1", servingUnit: "cup" },
  { name: "Black Coffee", calories: "2", protein: "0.3", carbs: "0", fats: "0", servingSize: "1", servingUnit: "cup" },
  { name: "Tea (Plain)", calories: "2", protein: "0", carbs: "0.5", fats: "0", servingSize: "1", servingUnit: "cup" },
  { name: "Coca Cola", calories: "140", protein: "0", carbs: "39", fats: "0", servingSize: "1", servingUnit: "can (12oz)" },
  { name: "Honey", calories: "64", protein: "0.1", carbs: "17", fats: "0", servingSize: "1", servingUnit: "tbsp" }
];

const allFoods = [...indianFoods, ...internationalFoods, ...generalFoods];

fs.writeFileSync('foods.json', JSON.stringify(allFoods, null, 2));
console.log(`Generated foods.json with ${allFoods.length} items`);
