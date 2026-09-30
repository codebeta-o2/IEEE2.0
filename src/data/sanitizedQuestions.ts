// Auto-generated sanitized questions bank for offline and client usage
// Contains ZERO answer keys and ZERO explanations for exam security
import { QuestionData } from "../types";

export const SANITIZED_QUESTIONS_POOL: QuestionData[] = [
  {
    "id": "q1",
    "number": 1,
    "subject": "Computer Networks & Protocols",
    "question": "Which OSI layer is responsible for end-to-end communication, flow control, error detection, and port addressing?",
    "options": [
      "Network Layer",
      "Transport Layer",
      "Data Link Layer",
      "Session Layer"
    ]
  },
  {
    "id": "q2",
    "number": 2,
    "subject": "Data Structures & Algorithms",
    "question": "What is the worst-case time complexity of searching for an element in an unaugmented Binary Search Tree (BST) of n elements?",
    "options": [
      "O(1)",
      "O(log n)",
      "O(n)",
      "O(n log n)"
    ]
  },
  {
    "id": "q3",
    "number": 3,
    "subject": "Operating Systems",
    "question": "Which of the following conditions is NOT one of Coffman's four necessary conditions for deadlock to occur?",
    "options": [
      "Mutual Exclusion",
      "Hold and Wait",
      "Preemption Permitted",
      "Circular Wait"
    ]
  },
  {
    "id": "q4",
    "number": 4,
    "subject": "Database Management Systems",
    "question": "In ACID properties of transaction management, what does the 'I' represent and what guarantee does it provide?",
    "options": [
      "Integrity: ensures constraints like primary keys are never violated",
      "Indexability: ensures fast B-tree lookup on indexed columns",
      "Isolation: ensures concurrently executing transactions do not interfere with each other",
      "Immutability: ensures written logs cannot be altered by users"
    ]
  },
  {
    "id": "q5",
    "number": 5,
    "subject": "JavaScript & Modern Web",
    "question": "What is the output of the following JavaScript expression: typeof (NaN === NaN)?",
    "codeSnippet": "console.log(typeof (NaN === NaN));",
    "options": [
      "\"number\"",
      "\"boolean\"",
      "\"undefined\"",
      "\"object\""
    ]
  },
  {
    "id": "q6",
    "number": 6,
    "subject": "Computer Architecture",
    "question": "Which cache mapping technique allows a block of main memory to be placed in any cache line without restriction?",
    "options": [
      "Direct Mapped Cache",
      "Fully Associative Cache",
      "Set-Associative Cache",
      "Sector Mapped Cache"
    ]
  },
  {
    "id": "q7",
    "number": 7,
    "subject": "Discrete Mathematics & Logic",
    "question": "What is the contrapositive of the conditional statement: 'If a student is in Offline Mode (P), then Network Auto-Submit is armed (Q)'?",
    "options": [
      "If Network Auto-Submit is armed, then the student is in Offline Mode.",
      "If Network Auto-Submit is NOT armed (~Q), then the student is NOT in Offline Mode (~P).",
      "If the student is NOT in Offline Mode (~P), then Network Auto-Submit is NOT armed (~Q).",
      "The student is in Offline Mode if and only if Network Auto-Submit is armed."
    ]
  },
  {
    "id": "q8",
    "number": 8,
    "subject": "Software Engineering & Security",
    "question": "Which cryptographic principle ensures that the sender cannot deny having sent a message that they indeed transmitted?",
    "options": [
      "Confidentiality",
      "Availability",
      "Non-repudiation",
      "Obfuscation"
    ]
  },
  {
    "id": "q9",
    "number": 9,
    "subject": "Computer Networks & Protocols",
    "question": "Which protocol resolves a known IPv4 address to its corresponding physical MAC address on a local area network?",
    "options": [
      "DNS (Domain Name System)",
      "DHCP (Dynamic Host Configuration Protocol)",
      "ARP (Address Resolution Protocol)",
      "ICMP (Internet Control Message Protocol)"
    ]
  },
  {
    "id": "q10",
    "number": 10,
    "subject": "Data Structures & Algorithms",
    "question": "Which data structure is fundamentally utilized to implement Breadth-First Search (BFS) traversal on a graph?",
    "options": [
      "Stack (LIFO)",
      "Queue (FIFO)",
      "Binary Min-Heap",
      "Disjoint Set Union (DSU)"
    ]
  },
  {
    "id": "q11",
    "number": 11,
    "subject": "Operating Systems",
    "question": "What is the phenomenon called when an operating system spends more time paging data into and out of virtual memory than executing actual instructions?",
    "options": [
      "Starvation",
      "Thrashing",
      "Aging",
      "Belady's Anomaly"
    ]
  },
  {
    "id": "q12",
    "number": 12,
    "subject": "Database Management Systems",
    "question": "Which normal form removes partial dependencies, ensuring that every non-prime attribute is fully functionally dependent on the entire candidate key?",
    "options": [
      "First Normal Form (1NF)",
      "Second Normal Form (2NF)",
      "Third Normal Form (3NF)",
      "Boyce-Codd Normal Form (BCNF)"
    ]
  },
  {
    "id": "q13",
    "number": 13,
    "subject": "JavaScript & Modern Web",
    "question": "What will be printed to the console when executing the following snippet involving JavaScript closures and event loop?",
    "codeSnippet": "for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}",
    "options": [
      "0, 1, 2",
      "3, 3, 3",
      "undefined, undefined, undefined",
      "0, 0, 0"
    ]
  },
  {
    "id": "q14",
    "number": 14,
    "subject": "Data Structures & Algorithms",
    "question": "What is the average and worst-case time complexity of the standard QuickSort algorithm with random pivot selection?",
    "options": [
      "Average O(n log n), Worst-case O(n log n)",
      "Average O(n log n), Worst-case O(n^2)",
      "Average O(n), Worst-case O(n log n)",
      "Average O(log n), Worst-case O(n)"
    ]
  },
  {
    "id": "q15",
    "number": 15,
    "subject": "Computer Networks & Protocols",
    "question": "During a standard TCP connection teardown, what is the sequence of control packets exchanged?",
    "options": [
      "SYN -> SYN-ACK -> ACK",
      "FIN -> ACK -> FIN -> ACK",
      "RST -> FIN -> ACK",
      "PING -> PONG -> CLOSE"
    ]
  },
  {
    "id": "q16",
    "number": 16,
    "subject": "Operating Systems",
    "question": "Which CPU scheduling algorithm is provably optimal in yielding the minimum average waiting time for a given set of stationary processes?",
    "options": [
      "First-Come, First-Served (FCFS)",
      "Shortest Job First (SJF / Shortest Remaining Time First)",
      "Round Robin with small quantum",
      "Priority Scheduling with aging"
    ]
  },
  {
    "id": "q17",
    "number": 17,
    "subject": "Database Management Systems",
    "question": "Why are B+ Trees preferred over standard Binary Search Trees or B-Trees for database index storage on disk?",
    "options": [
      "B+ Trees store all actual record keys/pointers in leaf nodes linked sequentially, facilitating fast range queries and high fan-out.",
      "B+ Trees require zero memory locks during concurrent writes.",
      "B+ Trees have an O(1) worst-case search complexity regardless of tree depth.",
      "B+ Trees eliminate the need for primary and foreign key constraints."
    ]
  },
  {
    "id": "q18",
    "number": 18,
    "subject": "Software Engineering & Architecture",
    "question": "In the SOLID design principles, what does the Liskov Substitution Principle (LSP) dictate?",
    "options": [
      "A class should have only one single reason to change.",
      "Subtypes must be substitutable for their base types without altering program correctness.",
      "Software entities should be open for extension but closed for modification.",
      "High-level modules should not depend on low-level modules directly."
    ]
  },
  {
    "id": "q19",
    "number": 19,
    "subject": "Aptitude & Quantitative Logic",
    "question": "If two unbiased standard six-sided dice are rolled simultaneously, what is the probability that the sum of the numbers showing is at least 10?",
    "options": [
      "1/6 (6 out of 36)",
      "1/9 (4 out of 36)",
      "5/36",
      "1/12 (3 out of 36)"
    ]
  },
  {
    "id": "q20",
    "number": 20,
    "subject": "Cybersecurity & Cryptography",
    "question": "What is the primary security objective of adding a unique cryptographic 'salt' to user passwords before hashing them with algorithms like bcrypt or Argon2?",
    "options": [
      "To compress the password into exactly 256 bits.",
      "To prevent precomputed rainbow table and mass collision attacks across identical passwords.",
      "To allow the server to easily decrypt and recover forgotten passwords.",
      "To speed up hash evaluation on mobile devices."
    ]
  },
  {
    "id": "q21",
    "number": 21,
    "subject": "Data Structures & Algorithms",
    "question": "In a Max-Heap containing n elements, what is the time complexity of deleting the maximum element (root) and restoring heap properties?",
    "options": [
      "O(1)",
      "O(log n)",
      "O(n)",
      "O(n log n)"
    ]
  },
  {
    "id": "q22",
    "number": 22,
    "subject": "Computer Networks & Protocols",
    "question": "Which HTTP status code specifically signifies that the client must authenticate themselves to get the requested response (Unauthorized)?",
    "options": [
      "400 Bad Request",
      "401 Unauthorized",
      "403 Forbidden",
      "404 Not Found"
    ]
  },
  {
    "id": "q23",
    "number": 23,
    "subject": "Operating Systems",
    "question": "What is a 'Spinlock' in synchronization, and when is it most appropriate to use over a mutex or semaphore?",
    "options": [
      "A lock where a thread loops continuously checking a flag; ideal when lock holding durations are extremely brief on multiprocessor systems.",
      "A lock that puts the calling thread into a deep sleep state immediately.",
      "A lock exclusively reserved for single-core microcontrollers to prevent context switches.",
      "A lock mechanism designed for distributed database consistency."
    ]
  },
  {
    "id": "q24",
    "number": 24,
    "subject": "JavaScript & Modern Web",
    "question": "Which method on an Array returns a new array with all sub-array elements concatenated into it recursively up to the specified depth?",
    "codeSnippet": "const nested = [1, [2, [3, 4]]];\nconst res = nested.flat(2);",
    "options": [
      "Array.prototype.concat()",
      "Array.prototype.reduce()",
      "Array.prototype.flat()",
      "Array.prototype.splice()"
    ]
  },
  {
    "id": "q25",
    "number": 25,
    "subject": "Discrete Mathematics & Logic",
    "question": "How many edges are there in a simple connected planar graph with 6 vertices and 8 faces according to Euler's planar formula (V - E + F = 2)?",
    "options": [
      "10",
      "12",
      "14",
      "16"
    ]
  },
  {
    "id": "q26",
    "number": 26,
    "subject": "Database Management Systems",
    "question": "What type of SQL JOIN returns all rows from the left table and matched rows from the right table, filling with NULL where there is no match?",
    "options": [
      "INNER JOIN",
      "LEFT OUTER JOIN",
      "RIGHT OUTER JOIN",
      "CROSS JOIN"
    ]
  },
  {
    "id": "q27",
    "number": 27,
    "subject": "Aptitude & Quantitative Logic",
    "question": "A train running at a uniform speed of 72 km/h crosses a 200-meter-long platform in 22 seconds. What is the length of the train?",
    "options": [
      "220 meters",
      "240 meters",
      "250 meters",
      "280 meters"
    ]
  },
  {
    "id": "q28",
    "number": 28,
    "subject": "Software Engineering & Design Patterns",
    "question": "Which Gang of Four (GoF) design pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable at runtime?",
    "options": [
      "Factory Pattern",
      "Observer Pattern",
      "Strategy Pattern",
      "Decorator Pattern"
    ]
  },
  {
    "id": "q29",
    "number": 29,
    "subject": "Computer Architecture",
    "question": "In a 5-stage classic RISC processor pipeline (IF, ID, EX, MEM, WB), what hazard occurs when an instruction depends on the result of a previous instruction that has not yet completed execution?",
    "options": [
      "Structural Hazard",
      "Data Hazard",
      "Control Hazard",
      "Branch Misprediction Hazard"
    ]
  },
  {
    "id": "q30",
    "number": 30,
    "subject": "Computer Networks & Protocols",
    "question": "What is the maximum payload size (in bytes) of a standard Ethernet frame (MTU) before IP fragmentation occurs?",
    "options": [
      "512 bytes",
      "1024 bytes",
      "1500 bytes",
      "65535 bytes"
    ]
  },
  {
    "id": "q31",
    "number": 31,
    "subject": "Data Structures & Algorithms",
    "question": "What is the amortized time complexity of inserting an element into a dynamic array (like std::vector or ArrayList) that doubles capacity when full?",
    "options": [
      "O(1)",
      "O(log n)",
      "O(n)",
      "O(n^2)"
    ]
  },
  {
    "id": "q32",
    "number": 32,
    "subject": "Operating Systems",
    "question": "Which page replacement algorithm suffers from Belady's Anomaly (where increasing the number of page frames leads to more page faults)?",
    "options": [
      "Least Recently Used (LRU)",
      "Optimal Page Replacement (OPT)",
      "First-In, First-Out (FIFO)",
      "Least Frequently Used (LFU)"
    ]
  },
  {
    "id": "q33",
    "number": 33,
    "subject": "JavaScript & Modern Web",
    "question": "Which of the following creates a truly immutable object in JavaScript where existing properties cannot be changed, added, or deleted?",
    "options": [
      "Object.preventExtensions(obj)",
      "Object.seal(obj)",
      "Object.freeze(obj)",
      "Object.assign({}, obj)"
    ]
  },
  {
    "id": "q34",
    "number": 34,
    "subject": "Aptitude & Quantitative Logic",
    "question": "A work can be completed by Person A in 12 days and by Person B in 24 days. Working together, how many days will they take to finish the job?",
    "options": [
      "6 days",
      "8 days",
      "10 days",
      "18 days"
    ]
  },
  {
    "id": "q35",
    "number": 35,
    "subject": "Cybersecurity & Cryptography",
    "question": "What kind of web vulnerability occurs when an application includes user input in an SQL query without proper parameterization or prepared statements?",
    "options": [
      "Cross-Site Scripting (XSS)",
      "Cross-Site Request Forgery (CSRF)",
      "SQL Injection (SQLi)",
      "Server-Side Request Forgery (SSRF)"
    ]
  },
  {
    "id": "q36",
    "number": 36,
    "subject": "Database Management Systems",
    "question": "What is the difference between TRUNCATE and DELETE in SQL?",
    "options": [
      "DELETE is DDL while TRUNCATE is DML.",
      "TRUNCATE is a DDL operation that resets identity/table storage quickly with minimal logging, while DELETE is a DML operation that removes rows row-by-row.",
      "DELETE cannot use a WHERE clause whereas TRUNCATE can.",
      "TRUNCATE cannot be rolled back even inside an explicit transaction in all RDBMS engines."
    ]
  },
  {
    "id": "q37",
    "number": 37,
    "subject": "Computer Networks & Protocols",
    "question": "In modern web security, which HTTP header instructs the browser that a site should only be accessed using HTTPS, never HTTP?",
    "options": [
      "Content-Security-Policy (CSP)",
      "Strict-Transport-Security (HSTS)",
      "X-Frame-Options",
      "Access-Control-Allow-Origin"
    ]
  },
  {
    "id": "q38",
    "number": 38,
    "subject": "Data Structures & Algorithms",
    "question": "What algorithm is typically used to find the strongly connected components (SCCs) of a directed graph in linear time O(V + E)?",
    "options": [
      "Dijkstra's Algorithm",
      "Tarjan's or Kosaraju's Algorithm",
      "Kruskal's Algorithm",
      "Floyd-Warshall Algorithm"
    ]
  },
  {
    "id": "q39",
    "number": 39,
    "subject": "Discrete Mathematics & Logic",
    "question": "If 13 pigeons are placed into 12 pigeonholes, the Pigeonhole Principle guarantees that:",
    "options": [
      "Every pigeonhole contains at least one pigeon.",
      "At least one pigeonhole must contain at least 2 pigeons.",
      "All pigeonholes have equal numbers of pigeons.",
      "Exactly one pigeonhole is empty."
    ]
  },
  {
    "id": "q40",
    "number": 40,
    "subject": "Software Engineering & Architecture",
    "question": "What does the concept of 'Idempotence' mean in API and distributed systems design?",
    "options": [
      "An operation that can be applied multiple times without changing the result beyond the initial application.",
      "An API endpoint that responds in less than 10 milliseconds under all network conditions.",
      "A database read replica that never falls behind the primary leader node.",
      "A software architecture pattern where all microservices share a single relational database."
    ]
  }
];
