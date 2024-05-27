const answer = {
 question1:'',
 question2:'',
 question3:'',
 question4:'',
 question5:'',
 question6:'',
 question7:'',
}

export const user_answering_data=( state=answer, action)=>{
    switch(action.type){
        case 'qusetion_answering_action':
            return {
                ...state,
                question1: action.question1,
                question2: action.question2,
                question3: action.question3,
                question4: action.question4,
                question5: action.question5,
                question6: action.question6,
                question7: action.question7
            }
        default:
            return state;
    }
}