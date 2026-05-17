export interface FallbackBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    previewLink?: string;
    infoLink?: string;
    categories?: string[];
  };
  accessInfo?: {
    publicDomain?: boolean;
    accessViewStatus?: string;
    webReaderLink?: string;
    pdf?: { downloadLink?: string; isAvailable?: boolean };
    epub?: { downloadLink?: string; isAvailable?: boolean };
  };
}

export const FALLBACK_BOOKS: Record<string, FallbackBook[]> = {
  all: [
    {
      id: "fb_all_1",
      volumeInfo: {
        title: "The Art of Learning: A Journey to Optimal Performance",
        authors: ["Josh Waitzkin"],
        description: "A comprehensive guide on the principles of learning, mastering skills, and training your mind for academic and professional excellence.",
        categories: ["Featured", "Education"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    },
    {
      id: "fb_all_2",
      volumeInfo: {
        title: "How to Become a Straight-A Student",
        authors: ["Cal Newport"],
        description: "A groundbreaking book that reveals the unconventional strategies used by top students to score high while studying less.",
        categories: ["Featured", "Education"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  engineering: [
    {
      id: "fb_eng_1",
      volumeInfo: {
        title: "Engineering Mechanics: Statics & Dynamics",
        authors: ["R.C. Hibbeler"],
        description: "A foundational textbook providing a clear and thorough presentation of the theory and application of engineering mechanics.",
        categories: ["Engineering"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    },
    {
      id: "fb_eng_2",
      volumeInfo: {
        title: "Introduction to Biomedical Engineering",
        authors: ["John Enderle", "Joseph Bronzino"],
        description: "A comprehensive introductory textbook covering biomechanics, biomaterials, bioinstrumentation, and biosignals.",
        categories: ["Engineering"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1576086213369-97a306dca665?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1576086213369-97a306dca665?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  cs: [
    {
      id: "fb_cs_1",
      volumeInfo: {
        title: "Introduction to Algorithms",
        authors: ["Thomas H. Cormen", "Charles E. Leiserson", "Ronald L. Rivest", "Clifford Stein"],
        description: "The definitive guide to computer algorithms, covering a broad range of algorithms in depth, yet making their design and analysis accessible to all levels.",
        categories: ["Computer Science"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    },
    {
      id: "fb_cs_2",
      volumeInfo: {
        title: "Clean Code: A Handbook of Agile Software Craftsmanship",
        authors: ["Robert C. Martin"],
        description: "A must-read handbook describing the principles, patterns, and practices of writing clean, maintainable, and robust software code.",
        categories: ["Computer Science"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  medicine: [
    {
      id: "fb_med_1",
      volumeInfo: {
        title: "Gray's Anatomy for Students",
        authors: ["Richard Drake", "A. Wayne Vogl", "Adam W. M. Mitchell"],
        description: "A highly visual, clinically-oriented human anatomy textbook designed specifically for medical and health science students.",
        categories: ["Medicine"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    },
    {
      id: "fb_med_2",
      volumeInfo: {
        title: "Harrison's Principles of Internal Medicine",
        authors: ["Joseph Loscalzo", "Anthony Fauci"],
        description: "The world's most trusted clinical medicine textbook, providing a milestone authority on disease mechanisms and patient care.",
        categories: ["Medicine"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  business: [
    {
      id: "fb_bus_1",
      volumeInfo: {
        title: "Principles of Management",
        authors: ["Stephen P. Robbins", "Mary A. Coulter"],
        description: "A foundational text on management theory, planning, organizing, leading, and controlling in modern global businesses.",
        categories: ["Business"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    },
    {
      id: "fb_bus_2",
      volumeInfo: {
        title: "Financial Accounting: An Introduction to Concepts",
        authors: ["Roman L. Weil", "Katherine Schipper"],
        description: "An authoritative guide to understanding corporate financial reports and the fundamental principles of accounting.",
        categories: ["Business"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  law: [
    {
      id: "fb_law_1",
      volumeInfo: {
        title: "Learning the Law",
        authors: ["Glanville Williams"],
        description: "A classic guide introducing students to legal methods, skills, jurisprudence, and navigating the complexities of case law.",
        categories: ["Law"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    },
    {
      id: "fb_law_2",
      volumeInfo: {
        title: "Constitutional Law: Principles and Policies",
        authors: ["Erwin Chemerinsky"],
        description: "An incredibly clear, detailed analysis of key constitutional doctrines, federal power, and civil liberties.",
        categories: ["Law"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1453733190148-c44698c265f8?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1453733190148-c44698c265f8?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  math: [
    {
      id: "fb_math_1",
      volumeInfo: {
        title: "Calculus: Early Transcendentals",
        authors: ["James Stewart"],
        description: "A standard-setting textbook widely praised for its mathematical precision, clarity of exposition, and outstanding examples.",
        categories: ["Mathematics"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    },
    {
      id: "fb_math_2",
      volumeInfo: {
        title: "Linear Algebra and Its Applications",
        authors: ["David C. Lay"],
        description: "An elementary introduction to linear algebra concepts, systems of linear equations, and vector spaces.",
        categories: ["Mathematics"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  physics: [
    {
      id: "fb_phy_1",
      volumeInfo: {
        title: "Fundamentals of Physics",
        authors: ["David Halliday", "Robert Resnick", "Jearl Walker"],
        description: "The gold standard physics textbook offering a solid understanding of fundamental physics concepts from mechanics to electromagnetism.",
        categories: ["Physics"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  biology: [
    {
      id: "fb_bio_1",
      volumeInfo: {
        title: "Campbell Biology",
        authors: ["Lisa A. Urry", "Michael L. Cain"],
        description: "The world's most successful biology textbook, known for its clear narrative, superior art, and active learning engagement.",
        categories: ["Biology"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  chemistry: [
    {
      id: "fb_chem_1",
      volumeInfo: {
        title: "Organic Chemistry",
        authors: ["Jonathan Clayden", "Nick Greeves", "Stuart Warren"],
        description: "An exceptionally readable and popular textbook detailing the mechanisms, structures, and reactions of organic compounds.",
        categories: ["Chemistry"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  psychology: [
    {
      id: "fb_psy_1",
      volumeInfo: {
        title: "Psychology: Themes and Variations",
        authors: ["Wayne Weiten"],
        description: "A superb survey of psychology introducing research methodologies, cognitive processes, personality, and social behavior.",
        categories: ["Psychology"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  economics: [
    {
      id: "fb_eco_1",
      volumeInfo: {
        title: "Economics",
        authors: ["Paul Samuelson", "William Nordhaus"],
        description: "The classic introduction to modern economic principles, microeconomics, macroeconomics, and global trade dynamics.",
        categories: ["Economics"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ],
  arts: [
    {
      id: "fb_art_1",
      volumeInfo: {
        title: "The Story of Art",
        authors: ["E.H. Gombrich"],
        description: "One of the most famous and popular books on art ever written, providing a brilliant survey of art history from cave paintings to modern design.",
        categories: ["Arts & Humanities"],
        imageLinks: {
          thumbnail: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=300",
          smallThumbnail: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=150"
        },
        previewLink: "https://books.google.com"
      }
    }
  ]
};
