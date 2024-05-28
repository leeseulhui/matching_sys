const colorMood={
    User_id:'',
    average_color:'',
    mood_image:[],
    mood_symbol:[],
    imageUrl:'',
    opacity:1
}

export const colorAnalysisData =(state=colorMood, action) =>{
    switch(action.type){
        case 'add_color_analysis':
            return {
                ...state,
                User_id:action.User_id,
                average_color:action.average_color,
                mood_image:action.mood_image,
                mood_symbol:action.mood_symbol
            }
        case 'select_image_url':
            return {
                ...state,
                imageUrl:action.imageUrl
            }
        default:
            return state;
    }

}