class Course:
    def __init__ (self, course_id, name, description, prereqs):
       self.course_id = course_id
       self.name = name
       self.description = description
       self.prereqs = prereqs
       
    def __repr__(self): 
       return (f"{self.name} - CourseID: {self.course_id}\n"
                f"Description: {self.description}\n"
                f"Prerequesites: {self.prereqs}\n")
