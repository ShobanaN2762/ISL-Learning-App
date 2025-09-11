/**
 * ISL Learning Platform - Learning Modules Data
 * Structured learning content for Indian Sign Language
 */

window.learningModules = [
  {
    id: "basics",
    title: "ISL Basics",
    description:
      "Learn the fundamental concepts and basic signs of Indian Sign Language",
    difficulty: "beginner",
    estimatedTime: "2-3 hours",
    category: "foundation",
    lessons: [
      {
        id: "intro-to-isl",
        title: "Introduction to ISL",
        description:
          "Understanding the history and importance of Indian Sign Language",
        duration: "15 minutes",
        type: "reading",
        content: `
                    <h3>Welcome to Indian Sign Language</h3>
                    <p>Indian Sign Language (ISL) is the primary sign language used by the deaf community in India. It is a complete, natural language with its own unique grammar and syntax.</p>
                    
                    <h4>History of ISL</h4>
                    <p>ISL has evolved over centuries within deaf communities across India. While it shares some similarities with other sign languages, it has its own distinct characteristics influenced by Indian culture and regional variations.</p>
                    
                    <h4>Why Learn ISL?</h4>
                    <ul>
                        <li><strong>Communication:</strong> Bridge the communication gap with the deaf community</li>
                        <li><strong>Inclusion:</strong> Promote inclusive environments in workplaces and social settings</li>
                        <li><strong>Career opportunities:</strong> Open doors to careers in interpretation, education, and social work</li>
                        <li><strong>Cultural understanding:</strong> Gain insight into deaf culture and perspectives</li>
                    </ul>
                    
                    <h4>Key Features of ISL</h4>
                    <p>ISL uses a combination of:</p>
                    <ul>
                        <li><strong>Hand shapes:</strong> Different configurations of fingers and hands</li>
                        <li><strong>Movement:</strong> Direction and type of hand movements</li>
                        <li><strong>Location:</strong> Where signs are made in relation to the body</li>
                        <li><strong>Facial expressions:</strong> Important for grammar and meaning</li>
                        <li><strong>Body language:</strong> Posture and body positioning</li>
                    </ul>
                `,
      },
      {
        id: "basic-greetings",
        title: "Basic Greetings",
        description: "Learn essential greeting signs for everyday interactions",
        duration: "18 minutes",
        type: "interactive-practice",
        modelType: "dynamic",
        content: [
          {
            name: "Good Morning",
            description: "Learn how to greet someone in the morning.",
            usage:
              "Used as a polite greeting in the morning, typically from waking up until noon.",
            videoSrc: "videos/sentences/good_morning.mp4",
          },
          {
            name: "Good Afternoon",
            description:
              "Learn the sign for greeting someone in the afternoon.",
            usage:
              "A common greeting used during the afternoon, from midday until early evening.",
            videoSrc: "videos/sentences/good_afternoon.mp4",
          },
          {
            name: "Good Evening",
            description:
              "Learn the polite way to greet someone in the evening.",
            usage: "Used as a polite greeting in the evening.",
            videoSrc: "videos/sentences/good_evening.mp4",
          },
          {
            name: "Good Night",
            description: "Learn how to say 'Good Night' as a farewell.",
            usage:
              "Used as a farewell late in the evening or just before going to sleep.",
            videoSrc: "videos/sentences/good_night.mp4",
          },
          {
            name: "Thank You",
            description: "Learn the essential sign to express gratitude.",
            usage:
              "An essential sign used to express gratitude or appreciation towards someone.",
            videoSrc: "videos/greetings/thank_you.mp4",
          },
        ],
      },
    ],
  },
  {
    id: "everyday-communication",
    title: "Everyday Communication",
    description:
      "Common signs and phrases for daily conversations and interactions",
    difficulty: "beginner",
    estimatedTime: "3-4 hours",
    category: "practical",
    lessons: [
      {
        id: "family-signs",
        title: "Family & Relationships",
        description: "Learn signs for family members and relationship terms",
        duration: "22 minutes",
        type: "interactive-practice",
        modelType: "dynamic",
        content: [
          {
            name: "Family",
            description: "Learn the foundational sign for 'Family'.",
            usage: "Refers to a group of related people or a household unit.",
            videoSrc: "videos/relationships/family.mp4",
          },
          {
            name: "Father",
            description: "Learn the important sign for 'Father'.",
            usage: "Used to identify or speak about one's male parent.",
            videoSrc: "videos/relationships/father.mp4",
          },
          {
            name: "Mother",
            description: "Learn the essential sign for 'Mother'.",
            usage: "Used to identify or speak about one's female parent.",
            videoSrc: "videos/relationships/mother.mp4",
          },
          {
            name: "Sister",
            description: "Learn how to sign 'Sister'.",
            usage: "Used when referring to a female sibling.",
            videoSrc: "videos/relationships/sister.mp4",
          },
          {
            name: "Grandmother",
            description: "Learn the sign for 'Grandmother'.",
            usage: "Refers to the mother of one's parent.",
            videoSrc: "videos/relationships/grandmother.mp4",
          },
          {
            name: "Grandfather",
            description: "Learn the sign for 'Grandfather'.",
            usage: "Refers to the father of one's parent.",
            videoSrc: "videos/relationships/grandfather.mp4",
          },
        ],
      },
      {
        id: "emotions-feelings",
        title: "Emotions & Feelings",
        description: "Express emotions and feelings through ISL signs",
        duration: "20 minutes",
        type: "interactive-practice",
        modelType: "dynamic",
        content: [
          {
            name: "Happy",
            description: "Learn the sign to express joy and happiness.",
            usage:
              "Used to show feelings of pleasure, contentment, or delight.",
            videoSrc: "videos/emotions/happy.mp4",
          },
          {
            name: "Sad",
            description: "Learn how to express sadness or sorrow.",
            usage:
              "Used to show feelings of unhappiness, grief, or disappointment.",
            videoSrc: "videos/emotions/sad.mp4",
          },
          {
            name: "Angry",
            description: "Learn the sign for being angry or upset.",
            usage:
              "Used to express strong feelings of annoyance, displeasure, or frustration.",
            videoSrc: "videos/emotions/angry.mp4",
          },
        ],
      },
      {
        id: "time-calendar",
        title: "Time & Calendar",
        description:
          "Learn to express time, dates, and schedule-related concepts",
        duration: "25 minutes",
        type: "interactive-practice",
        modelType: "dynamic",
        content: [
          {
            name: "Now",
            description:
              "Learn how to sign 'Now' or 'Today' to indicate immediacy.",
            usage: "Refers to the present moment or the present day.",
            videoSrc: "videos/time_calendar/now.mp4",
          },
          {
            name: "Monday",
            description: "Learn the sign for 'Monday'.",
            usage: "The first day of the typical working week.",
            videoSrc: "videos/time_calendar/monday.mp4",
          },
          {
            name: "Tuesday",
            description: "Learn the sign for 'Tuesday'.",
            usage: "The second day of the typical working week.",
            videoSrc: "videos/time_calendar/tuesday.mp4",
          },
          {
            name: "Wednesday",
            description: "Learn the sign for 'Wednesday'.",
            usage: "The third day of the typical working week.",
            videoSrc: "videos/time_calendar/wednesday.mp4",
          },
          {
            name: "Thursday",
            description: "Learn the sign for 'Thursday'.",
            usage: "The fourth day of the typical working week.",
            videoSrc: "videos/time_calendar/thursday.mp4",
          },
          {
            name: "Friday",
            description: "Learn the sign for 'Friday'.",
            usage: "The fifth and final day of the typical working week.",
            videoSrc: "videos/time_calendar/friday.mp4",
          },
          {
            name: "Saturday",
            description: "Learn the sign for 'Saturday'.",
            usage: "The first day of the weekend.",
            videoSrc: "videos/time_calendar/saturday.mp4",
          },
          {
            name: "Sunday",
            description: "Learn the sign for 'Sunday'.",
            usage: "The second day of the weekend, often a day of rest.",
            videoSrc: "videos/time_calendar/sunday.mp4",
          },
        ],
      },
    ],
  },
  {
    id: "numbers-math",
    title: "Numbers",
    description: "Master number signs and basic mathematical concepts in ISL",
    difficulty: "beginner",
    estimatedTime: "2 hours",
    category: "academic",
    lessons: [
      {
        id: "basic-numbers",
        title: "Numbers 1-9",
        description: "Learn to sign numbers from 1 to 100 accurately",
        duration: "30 minutes",
        type: "interactive-practice",
        modelType: "static",
        content: [
          {
            name: "1",
            description: "Learn the sign for 'Sunday'.",
            usage: "The second day of the weekend, often a day of rest.",
            videoSrc: "videos/numbers/one.mp4",
          },
          {
            name: "2",
            description: "Learn the sign for 'Sunday'.",
            usage: "The second day of the weekend, often a day of rest.",
            videoSrc: "videos/numbers/two.mp4",
          },
          {
            name: "3",
            description: "Learn the sign for 'Sunday'.",
            usage: "The second day of the weekend, often a day of rest.",
            videoSrc: "videos/numbers/three.mp4",
          },
          {
            name: "4",
            description: "Learn the sign for 'Sunday'.",
            usage: "The second day of the weekend, often a day of rest.",
            videoSrc: "videos/numbers/four.mp4",
          },
          {
            name: "5",
            description: "Learn the sign for 'Sunday'.",
            usage: "The second day of the weekend, often a day of rest.",
            videoSrc: "videos/numbers/five.mp4",
          },
          {
            name: "6",
            description: "Learn the sign for 'Sunday'.",
            usage: "The second day of the weekend, often a day of rest.",
            videoSrc: "videos/numbers/six.mp4",
          },
          {
            name: "7",
            description: "Learn the sign for 'Sunday'.",
            usage: "The second day of the weekend, often a day of rest.",
            videoSrc: "videos/numbers/seven.mp4",
          },
          {
            name: "8",
            description: "Learn the sign for 'Sunday'.",
            usage: "The second day of the weekend, often a day of rest.",
            videoSrc: "videos/numbers/eight.mp4",
          },
          {
            name: "9",
            description: "Learn the sign for 'Sunday'.",
            usage: "The second day of the weekend, often a day of rest.",
            videoSrc: "videos/numbers/nine.mp4",
          },
        ],
      },
    ],
  },
];
