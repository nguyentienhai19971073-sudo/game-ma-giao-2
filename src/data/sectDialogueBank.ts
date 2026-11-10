import { DialogueCategory, DialogueLineConfig, SectLeaderPersonality } from '../types/magiao';

// ============================================================================
// 1. KHOE "TỘI ÁC" NGỚ NGẨN – 100 CÂU RIÊNG BIỆT (silly_evil_boast)
// ============================================================================
const SILLY_EVIL_BOAST_TEXTS: string[] = [
  'Hôm nay bổn tọa làm một việc đại ác chấn động thiên hạ: uống trà sữa trân châu mà cố tình bỏ lại ba viên trân châu không thèm hút!',
  'Nghe cho rõ đây! Sáng nay bổn tọa ăn mì tôm mà không thèm bỏ gói hành khô, chánh phái biết chuyện chắc khóc thét ba ngày ba đêm!',
  'Đêm qua ta lén bước qua vạch kẻ đường bằng chân trái trước, đúng là tà đạo vô song, thiên hạ ai dám bắt chước bổn tọa?',
  'Bổn tọa vừa đặt báo thức lúc năm giờ sáng rồi bấm tắt ngủ tiếp tới trưa, tà công cỡ đó hỏi võ lâm ai sánh bằng?',
  'Hôm qua ta mượn cây bút của Đại Trưởng Lão rồi trả lại nhưng quên bấm ngòi vào trong, ác chấn động giang hồ chưa?',
  'Sáng nay bổn tọa đi ngang qua chú chó trước cổng sơn trang mà không thèm vẫy tay chào, trái tim sắt đá của Ma Giáo là đây!',
  'Ta vừa bóc gói bánh tráng trộn mà không thèm vắt tắc, vị chua cay nhân gian không làm lung lay được đạo tâm tà phái!',
  'Đêm qua bổn tọa xem phim kiếm hiệp đến tập cuối rồi bấm dừng ở phút thứ tư mươi, để mặc nam chính đứng giữa trời mưa!',
  'Ngươi tưởng bổn tọa hiền lành ư? Hôm nay ta ăn phở mà không cho một giọt tương ớt nào, mặt lạnh như băng tuyết ngàn năm!',
  'Khi nãy Hộ Pháp rót trà nóng, bổn tọa thổi đúng một hơi rồi để nguội luôn không uống, đúng là tà khí ngập trời!',
  'Hôm qua bổn tọa đi chợ mua rau, bà bán hàng thối dư năm trăm đồng, ta đứng suy nghĩ ba giây mới trả lại, quá sức tà ác!',
  'Ta vừa gấp chăn màn buổi sáng nhưng cố tình để lệch một góc hai phân, cho thiên hạ biết thế nào là Ma Giáo bất quy tắc!',
  'Sáng nay bổn tọa đánh răng bằng bàn chải màu hồng nhưng mặt vẫn cực kỳ sát khí, chánh phái nhìn thấy ắt phải hồn xiêu phách lạc!',
  'Hôm nay ta ra lệnh cho toàn bộ đệ tử trong giáo phải cười mỉm khi tập võ, ai cười hở tám cái răng sẽ bị phạt ăn thêm một chén cơm!',
  'Bổn tọa vừa đi dưới mưa mà không thèm bung dù, chỉ vì làm biếng bấm nút chứ không phải thất tình đâu nhé!',
  'Nghe đồn chánh phái sợ nhất người vô tình, vậy mà sáng nay bổn tọa ăn xôi gà lại cố tình chừa miếng da gà ngon nhất đến cuối mới ăn!',
  'Đêm qua ta thức tới mười giờ rưỡi mới đi ngủ, phá vỡ quy luật dưỡng sinh của võ lâm, đúng là đại ma đầu không sợ trời không sợ đất!',
  'Ta vừa viết bí kíp võ công lên giấy nháp rồi vẽ thêm hình con mèo ở góc trang, hậu thế ngàn năm sau chắc chắn tẩu hỏa nhập ma!',
  'Hôm nay bổn tọa mặc áo choàng đen thêu rồng nhưng bên trong lại mang tất hình con vịt vàng, sự phản diện này quá sâu sắc!',
  'Khi nãy ta đi ngang hồ sen hậu viện, thấy con cá chép bơi qua mà ta không thèm khen nó đẹp, lòng dạ bổn tọa thật quá lạnh lùng!',
  'Bổn tọa vừa bóc quả quýt mà không thèm lột sạch xơ trắng, ăn luôn một múi không chớp mắt, tà công đã đạt cảnh giới tối thượng!',
  'Sáng nay ta pha cà phê sữa mà khuấy ngược chiều kim đồng hồ đúng bảy vòng, làm đảo loạn âm dương ngũ hành trong ly đá!',
  'Hôm qua bổn tọa hứa chỉ ăn một miếng bánh ngọt thôi, thế mà ta cắn một phát hết nửa cái, chữ tín của ma đầu thật đáng sợ!',
  'Ta vừa nhìn vào gương tự khen mình đẹp trai suốt mười lăm phút, làm tấm gương đồng trong đại điện suýt nứt vì quá tải nhan sắc!',
  'Ngươi có biết vì sao giang hồ gọi ta là Dạ Thiên Minh không? Vì ban đêm ta hay cầm đèn đi tìm đồ ăn vặt trong bếp giáo chúng!',
  'Sáng nay bổn tọa đọc mật thư của chánh phái gửi tới, đọc xong ta gấp thành chiếc máy bay giấy phóng thẳng ra ngoài sân!',
  'Ta vừa ra một quyết định tàn khốc: hôm nay toàn bộ đệ tử Ma Giáo phải uống đủ hai lít nước lọc, ai thiếu một ngụm không được nghỉ!',
  'Đêm qua trăng tròn vành vạnh, bổn tọa đứng trên đỉnh điện thở dài một tiếng chỉ vì quên mất mật khẩu rương bánh pía!',
  'Hôm nay bổn tọa đi giày trái trước giày phải sau, bước đi hiên ngang làm gạch lát đại điện cũng phải run sợ!',
  'Ta vừa chấm khoai tây chiên vào sốt cà chua rồi lại quệt thêm miếng tương ớt, hỗn nguyên tà pháp này chánh phái sao hiểu thấu!',
  'Khi nãy có cơn gió thổi bay tà áo choàng, bổn tọa phải đứng gồng cơ bụng suốt năm phút để giữ dáng bá chủ thiên hạ!',
  'Hôm qua ta đi ngang qua sạp kẹo hồ lô dưới chân núi, nhìn chăm chú ba giây rồi quay lưng bỏ đi vì quên mang túi tiền!',
  'Bổn tọa vừa ăn dưa hấu mà không thèm nhả hạt... à nhầm, ta mua dưa hấu không hạt, nhưng thái độ ăn rất chi là tàn bạo!',
  'Sáng nay ta tập Ma Ảnh Bộ nhanh đến mức dép văng một chiếc lên mái ngói, giờ vẫn chưa sai Hộ Pháp leo lên lấy xuống!',
  'Ta vừa nghe nhạc cổ cầm mà gật gù theo nhịp trống múa lân, nghệ thuật tà phái vốn dĩ vượt xa tầm hiểu biết của phàm nhân!',
  'Đêm qua bổn tọa nằm mơ thấy mình thống nhất võ lâm, đang chuẩn bị nhận cúp thì giật mình tỉnh dậy vì muỗi đốt ngay mũi!',
  'Hôm nay ta cố tình viết chữ Ma Giáo hơi nghiêng về bên phải năm độ, ai nhìn vào cũng thấy khí chất ngang tàng bất khuất!',
  'Bổn tọa vừa uống hết ly nước mía siêu to khổng lồ trong một hơi, làm bà chủ quán dưới chân núi phải chắp tay bái phục!',
  'Khi nãy ta ngồi trên ngai vàng nghiêm nghị suốt nửa canh giờ, thật ra là do tê chân quá chưa đứng dậy nổi!',
  'Hôm qua bổn tọa ra lệnh sơn lại cột đại điện màu đỏ thẫm, nhìn từ xa tưởng huyết hải ma cung, lại gần mới biết màu sơn chống thấm!',
  'Ta vừa phát minh ra chiêu thức mới: Thiên Ma Ngáp Dài, mỗi lần tung chiêu là cả sảnh đệ tử đều buồn ngủ theo!',
  'Sáng nay bổn tọa ăn bánh mì thịt nướng, cố tình rút cọng ngò rí bỏ ra ngoài, hành động quyết đoán không chút do dự!',
  'Ngươi nhìn ánh mắt sắc lạnh của bổn tọa xem, thật ra là do nãy rửa mặt nước vào mắt hơi cay thôi đấy!',
  'Đêm qua ta ngồi thiền dưới ánh trăng, tâm bất biến giữa dòng đời vạn biến, cho tới khi mùi gà nướng từ bếp bay ngang qua!',
  'Hôm nay bổn tọa tuyên bố ăn chay... trong vòng mười lăm phút giữa bữa sáng và bữa trưa, đạo tâm thật kiên định!',
  'Ta vừa bẻ đôi chiếc đũa dùng một lần mà một bên to một bên nhỏ, vẫn thản nhiên gắp thịt không cần đổi đôi mới!',
  'Khi nãy Đại Trưởng Lão bẩm báo ngân khố giáo phái, bổn tọa nghe tới đoạn tiền ăn vặt chiếm bảy phần mà mặt không hề đỏ!',
  'Hôm qua ta đi dạo hậu sơn, thấy bông hoa dại nở lệch lối đi, bổn tọa liền bước vòng qua chứ nhất quyết không giẫm lên!',
  'Bổn tọa vừa cắn hạt hướng dương bằng răng cửa suốt nửa tiếng, vỏ xếp thành hình bát quái trận đồ ngay trên bàn trà!',
  'Sáng nay ta thức dậy sớm hơn con gà trống của bổn giáo, còn đứng trước chuồng gáy替 nó một tiếng làm nó ngơ ngác cả buổi!',
  'Ta vừa rót nước vào bình giữ nhiệt đến đúng vạch tối đa, thêm một giọt nữa là tràn, sự liều lĩnh này ai sánh kịp?',
  'Hôm nay bổn tọa ra quy định mới: đệ tử nào đi ngang ngai vàng mà không khen Giáo Chủ phong độ sẽ phải múa quyền ba hiệp!',
  'Đêm qua ta đếm cừu để ngủ, đếm tới con thứ chín trăm chín mươi chín thì ta bắt nó vào Ma Giáo luyện võ luôn!',
  'Bổn tọa vừa ăn kem giữa trời lạnh mà không thèm mặc thêm áo khoác, hàn băng chân khí trong người tự khắc trấn áp!',
  'Khi nãy ta giả vờ nhìn xa xăm đầy tâm sự, thực chất là đang nhẩm tính xem chiều nay ăn lẩu thái hay lẩu bò!',
  'Hôm qua bổn tọa cho phép đệ tử nghỉ tập sớm năm phút, lòng nhân từ đột xuất của ma đầu còn đáng sợ hơn cả bão tố!',
  'Ta vừa mở nắp hộp sữa chua mà không thèm liếm phần dính trên nắp, bậc chí tôn thiên hạ phải biết kiềm chế bản thân!',
  'Sáng nay bổn tọa bước lên ngai vàng trượt chân một nhịp nhưng lập tức xoay người thành thế Bạch Hạc Lượng Sực, không ai phát hiện!',
  'Hôm nay ta đeo ngọc bội bên hông trái thay vì hông phải, làm toàn bộ tình báo chánh phái hoang mang tưởng ám hiệu tấn công!',
  'Bổn tọa vừa uống canh khổ qua mà không nhăn mặt lấy một lần, nỗi khổ nhân gian ta đã nuốt trọn vào bụng!',
  'Đêm qua ta viết nhật ký đại ma đầu: Ngày tháng năm, trời mưa nhỏ, hôm nay chưa nghĩ ra trò gì ác nên đi ngủ sớm!',
  'Khi nãy có con bướm đậu lên tay vịn ngai vàng, bổn tọa ngồi im không nhúc nhích suốt mười phút sợ nó giật mình bay mất!',
  'Ta vừa luyện thành tuyệt kỹ nhìn chằm chằm vào nồi nước lèo khiến nước sôi nhanh hơn... ba giây so với bình thường!',
  'Hôm qua bổn tọa đi vi hành dưới núi, thấy trẻ con chơi nhảy dây liền nhảy vào làm mẫu ba vòng rồi mới phất áo bỏ đi!',
  'Sáng nay ta chải tóc rẽ ngôi giữa lệch sang trái đúng một sợi, phong thái tà mị này làm hoa nhường nguyệt thẹn!',
  'Bổn tọa vừa ra lệnh cho phòng bếp làm đậu hũ chiên giòn, miếng nào không giòn ta đích thân... ăn hết để tiêu hủy tang chứng!',
  'Hôm nay ta ngồi bắt chéo chân trên ngai vàng, đổi chân liên tục mỗi năm phút để rèn luyện cân bằng âm dương!',
  'Đêm qua bổn tọa nghe tiếng gió rít ngoài hiên, tưởng cao thủ võ lâm tập kích, hóa ra quên đóng cửa sổ phòng bếp!',
  'Ta vừa xé lịch treo tường sớm hơn năm phút trước nửa đêm, kẻ nắm giữ thời gian trong thiên hạ chính là bổn tọa!',
  'Khi nãy Hộ Pháp hỏi bí quyết giữ vẻ mặt uy nghiêm, ta bảo cứ tưởng tượng ai đó vừa ăn mất miếng sườn nướng cuối cùng của mình!',
  'Hôm qua bổn tọa thử nhịn cười khi nghe chuyện tiếu lâm của đệ tử, kết quả nội thương nhẹ vì phải nín thở quá lâu!',
  'Sáng nay ta tưới cây bonsai trong đại điện bằng muỗng múc canh, từng giọt chuẩn xác như ám khí Đường Môn!',
  'Bổn tọa vừa phát hiện áo choàng ma tôn có túi ẩn bên trong, cất vừa khít hai gói hạt dẻ rang bơ nóng hổi!',
  'Hôm nay ta nhìn mây bay trên đỉnh Ma Sơn, thấy đám mây giống cái đùi gà quay liền truyền lệnh mở tiệc toàn giáo!',
  'Đêm qua bổn tọa tập khinh công trên đệm lò xo trong tẩm cung, bay cao tới mức đầu chạm luôn màn trướng!',
  'Ta vừa ký duyệt ngân sách mua thêm năm chục cái chổi quét sân, đệ tử nào lười tập võ cứ chuẩn bị tinh thần rèn cơ tay!',
  'Khi nãy ta uống trà hoa cúc pha mật ong, vị ngọt thanh tao nhưng ánh mắt vẫn giữ nguyên mười phần sát khí bá vương!',
  'Hôm qua bổn tọa thách đấu cờ caro với Đại Trưởng Lão, thắng liền ba ván nhờ tuyệt chiêu đánh vào ô chính giữa trước!',
  'Sáng nay ta đứng trước quạt gió mở số ba cho áo choàng bay phần phật, hiệu ứng trường quay tự nhiên chuẩn điện ảnh!',
  'Bổn tọa vừa ăn hết dĩa trái cây tráng miệng trước khi món chính dọn lên, đảo ngược trình tự ẩm thực của cả võ lâm!',
  'Hôm nay ta quyết định không thèm giận mấy kẻ chánh phái nữa, vì giận nhiều mau xuất hiện nếp nhăn trên trán bổn tọa!',
  'Đêm qua bổn tọa luyện Hấp Tinh Đại Pháp với... cái ống hút trà sữa, hút một phát lên luôn cả thạch dừa lẫn pudding!',
  'Ta vừa điểm huyệt cái gối ôm trong phòng ngủ vì tội dám rơi xuống đất lúc bổn tọa đang xoay người!',
  'Khi nãy ta đi kiểm tra sân luyện võ, thấy viên sỏi nằm giữa sân liền dùng ngón chân đá văng vào bụi cỏ, nội lực thâm hậu vô cùng!',
  'Hôm qua bổn tọa mặc nhầm áo trong ra ngoài suốt buổi sáng, may mà ta bảo đó là mốt mới của Tây Vực nên đệ tử ai cũng trầm trồ!',
  'Sáng nay ta ăn bánh bao nhân thịt trứng cút, cắn đúng một miếng trúng ngay lòng đỏ, vận khí của Thiên Ma đang ở đỉnh cao!',
  'Bổn tọa vừa ra sắc lệnh cấm ai trong đại điện được buồn, kẻ nào mặt ủ mày chau sẽ bị ta bắt nghe kể chuyện cười tới sáng!',
  'Hôm nay ta dùng quạt giấy phe phẩy giữa mùa thu mát mẻ, chủ yếu để khoe cổ tay dẻo dai chứ không phải vì nóng!',
  'Đêm qua bổn tọa thức canh nồi chè đậu xanh trên bếp lò, canh kỹ đến mức ăn thử hết nửa nồi lúc nào không hay!',
  'Ta vừa truyền thụ cho đệ tử bí quyết né đòn tối thượng: thấy đối thủ mạnh quá thì quay lưng chạy về gọi Giáo Chủ ra xử!',
  'Khi nãy ta thử gằn giọng cười ha hả kiểu phản diện, cười xong phải uống liền ngụm nước ấm cho dịu cổ họng!',
  'Hôm qua bổn tọa tự tay buộc lại dây giày kiểu thắt nơ kép, đi khắp cửu châu tứ hải không bao giờ sợ tuột dây!',
  'Sáng nay ta nhìn thấy con kiến bò qua bàn nghị sự, bổn tọa lấy ngón tay vẽ đường vòng bắt nó đi theo mê cung bát quái!',
  'Bổn tọa vừa từ chối lời mời đi họp võ lâm minh chủ chỉ vì trùng giờ phát sóng bộ kịch truyền thanh yêu thích!',
  'Hôm nay ta tuyên bố Ma Giáo chúng ta là tà phái số một thiên hạ: chuyên đi ngủ đúng giờ, ăn đủ bữa và tập thể dục đều đặn!',
  'Đêm qua bổn tọa luyện chưởng gió làm tắt ngọn nến cách ba bước chân, thật ra là thổi bằng miệng lúc không ai để ý!',
  'Ta vừa kiểm kê kho báu bổn giáo: vàng bạc châu báu xếp gọn một góc, ưu tiên chỗ rộng nhất để xếp mì gói và bánh tráng!',
  'Khi nãy ta ngồi trầm tư vuốt cằm như đang tính đại sự thiên hạ, thực ra là đang tìm xem còn sợi râu nào quên cạo không!',
  'Hôm qua bổn tọa đi ngang phòng luyện công, nghe đệ tử hô khẩu hiệu khí thế quá nên ta cũng lén hô theo một tiếng thật to!',
  'Nghe lệnh bổn tọa đây: làm người trong Ma Giáo phải sống thật ngầu, dù có vấp ngã cũng phải tạo dáng nằm chống cằm thật đẹp!'
];

// ============================================================================
// 2. CHÀO NGƯỜI MỚI – 50 CÂU RIÊNG BIỆT (welcome_new)
// ============================================================================
const WELCOME_NEW_TEXTS: string[] = [
  'Khá lắm! {playerName} vừa bước qua cổng Ma Giáo, từ nay chính thức nhập môn làm đồ đệ dưới trướng bổn tọa!',
  'Ồ, có kẻ to gan dám闯 vào Đại Điện! Chào mừng {playerName} gia nhập Thiên Hạ Đệ Nhất Tà Phái!',
  'Cổng sơn trang vừa mở, {playerName} đã tiến vào hành lễ! Mau tìm chỗ đứng trong hàng ngũ đệ tử đi nào!',
  'Haha! Hôm nay Ma Giáo lại có thêm một nhân tài! {playerName}, mau cúi chào bổn tọa rồi vào sân luyện võ!',
  'Gió ma nổi lên rồi! Thì ra là {playerName} vừa đặt chân tới tổng đà Ma Giáo, khí chất cũng không tệ đâu!',
  'Người mới tới kìa! {playerName} bước vào sảnh rất đúng lúc, bổn tọa đang thiếu người cùng đại náo giang hồ!',
  'Hộ Pháp đâu, ghi tên {playerName} vào sổ vàng Ma Giáo! Từ nay có phúc cùng hưởng, có chổi cùng quét sân!',
  'Bước chân vững vàng đấy {playerName}! Nhập môn Ma Giáo rồi thì nhớ gõ lệnh tập võ cho chăm chỉ nghe chưa!',
  'Chào mừng {playerName} bước vào đại điện! Nhìn bộ dạng ngươi chắc chắn là kỳ tài luyện võ trăm năm có một!',
  'Ái chà, {playerName} vừa xuất hiện làm đèn lồng đại điện sáng rực lên! Mau vào bái kiến Giáo Chủ nào!',
  'Không hẹn mà gặp, {playerName} đã tìm tới Ma Giáo! Ở đây không có规矩 rườm rà, chỉ cần ngầu và vui là được!',
  'Đệ tử mới {playerName} đã tới! Nhớ đứng thẳng hàng lối giữa đại điện, đừng chen lấn kẻo rách áo choàng mới phát!',
  'Hoan nghênh {playerName} gia nhập đại gia đình tà phái! Vào đây rồi thì chánh phái không ai dám bắt nạt ngươi đâu!',
  'Bổn tọa vừa bấm quẻ biết ngay có quý nhân nhập môn, hóa ra chính là {playerName} bước vào từ cổng chính!',
  'Mau dọn đường chính đạo cho {playerName} tiến vào hành lễ! Chào mừng tân đồ đệ của Ma Giáo Online!',
  'Khí thế bất phàm! {playerName} vừa bình luận một câu đã hóa thân thành đệ tử giữa sảnh lớn rồi kìa!',
  'Này {playerName}, bước vào Ma Giáo là quyết định sáng suốt nhất cuộc đời hành tẩu giang hồ của ngươi đấy!',
  'Tân đệ tử {playerName} đã điểm danh! Mau vào vị trí khởi động tay chân chuẩn bị tiếp chiêu của bổn tọa!',
  'Chào {playerName} nhé! Vừa vào cửa đã biết chắp tay bái sư, lễ nghi Ma Giáo thế này là mười điểm không có nhưng!',
  'Trống trận vang lên! Đón chào {playerName} chính thức bước chân vào Đại Điện Ma Giáo hôm nay!',
  'Ô kìa, {playerName} đã tới! Nghe danh Ma Giáo vui nhất thiên hạ nên vội vã phi ngựa tới nhập môn phải không?',
  'Bổn tọa chuẩn phê chuẩn cho {playerName} nhập môn! Hiện tại đang ở bậc {rankName}, cố gắng tu luyện lên chức nhé!',
  'Thêm một cao thủ tương lai xuất hiện! {playerName}, mau chọn một góc đẹp trong đại điện mà luyện quyền đi!',
  'Đại Điện hôm nay náo nhiệt hẳn lên nhờ có {playerName} vừa bước qua cổng đá rồng cuộn!',
  'Hảo hán {playerName} đã gia nhập! Nhớ gõ lệnh đi, chạy, võ, múa để cho thiên hạ thấy thân pháp của ngươi!',
  'Bổn tọa ngồi trên ngai cao nhìn xuống đã thấy ngay {playerName} vừa bước vào, tướng mạo rất hợp làm đại hiệp tà phái!',
  'Cửa Ma Giáo rộng mở đón {playerName}! Vào đây cùng các sư huynh sư tỷ luyện công đàm đạo nào!',
  'Một làn khói tím bay qua, {playerName} đã hiện thân tại Đại Điện! Chào mừng ngươi về dưới trướng bổn tọa!',
  'Tân môn nhân {playerName} nghe lệnh: vào sảnh phải giữ tinh thần sảng khoái, tập võ hết mình, cười tươi hết cỡ!',
  'Chào mừng {playerName}! Mới bậc {rankName} thôi nhưng ánh mắt đã lộ rõ vẻ muốn tranh ngôi Giáo Chủ rồi đấy!',
  'Đệ tử {playerName} đã nhập sảnh! Hộ Pháp mau phát ngay một bộ y phục nhập môn thật bảnh bao!',
  'Từ giờ phút này, {playerName} đã mang danh hiệu người của Ma Giáo, đi khắp giang hồ ai nghe cũng phải nể ba phần!',
  'Hay lắm, {playerName} đã tới! Đứng ở khu đệ tử bên cánh sảnh hay ra thảm tập võ đều tùy ý ngươi!',
  'Tiếng chuông đồng ngân vang báo hiệu {playerName} vừa bước chân vào thánh địa của bổn giáo!',
  'Nhìn bước đi của {playerName} từ cổng vào kìa, khoan thai tự đắc, đúng chuẩn phong thái đệ tử chân truyền!',
  'Bổn tọa rất ưng ý khi thấy {playerName} gia nhập! Cứ bình luận trò chuyện thoải mái để tăng thêm linh khí đại điện!',
  'Nào các đồ đệ cũ, mau vỗ tay chào đón tân đồng môn {playerName} vừa bước vào sảnh chính!',
  'Giang hồ hiểm ác không bằng về Ma Giáo ăn bánh uống trà, chào mừng {playerName} đã tìm đúng nơi quy tụ!',
  'Tân đệ tử {playerName} vừa bái sư xong! Chúc ngươi sớm ngày lĩnh hội tuyệt học Thiên Ma Thần Công!',
  'Ồ, {playerName} đã xuất hiện! Có thêm ngươi trong đội hình, kỳ sát hạch luyện võ sắp tới chắc chắn đại thắng!',
  'Bước qua tam quan Ma Giáo là người một nhà, chào mừng {playerName} đến với đại điện của bổn tọa!',
  'Ánh đuốc bập bùng soi bóng {playerName} tiến vào chính điện, khí thế chẳng kém gì bậc cao thủ giang hồ!',
  'Chào {playerName}! Đừng ngại ngùng, vào Ma Giáo rồi thì cứ tung quyền múa cước cho giãn gân cốt đi!',
  'Bổn tọa tuyên bố: {playerName} chính thức có tên trong danh sách đệ tử tinh nhuệ đang có mặt tại sảnh!',
  'Một bước nhập môn, vạn dặm tung hoành! Hoan nghênh {playerName} gia nhập Ma Giáo Online!',
  'Nghe tiếng bước chân ngoài cổng là biết người quen, chào mừng {playerName} đã ghé thăm Đại Điện Ma Giáo!',
  'Tân đồ đệ {playerName} đã vào vị trí! Nhớ chú ý nghe hiệu lệnh của bổn tọa mỗi khi mở hội luyện võ nhé!',
  'Chào mừng {playerName}! Hôm nay trời đẹp gió mát, rất thích hợp để ngươi bắt đầu con đường tu luyện tại bổn giáo!',
  'Khí vận Ma Giáo đang lên cao, lại đón thêm {playerName} nhập môn, đúng là song hỷ lâm môn!',
  'Bổn tọa gật đầu tán thưởng! {playerName} vừa vào đã đứng nghiêm chỉnh trong hàng ngũ, tương lai ắt làm nên chuyện lớn!'
];

// ============================================================================
// 3. PHONG CHỨC – 50 CÂU RIÊNG BIỆT (promotion)
// ============================================================================
const PROMOTION_TEXTS: string[] = [
  'Thiên địa chứng giám! {playerName} vừa dâng {giftName}, bổn tọa lập tức sắc phong lên bậc {rankName}!',
  'Khí thế bức người! Nhờ bảo vật {giftName}, {playerName} đã đột phá cảnh giới, thăng lên chức {rankName}!',
  'Toàn giáo nghe lệnh! Từ giây phút này, {playerName} chính thức tấn thăng làm {rankName}, y phục và hào quang đổi mới hoàn toàn!',
  'Haha! {playerName} hào sảng dâng tặng {giftName}, bổn tọa không tiếc lời vàng ngọc phong ngay chức {rankName}!',
  'Rồng bay phượng múa giữa đại điện! Chúc mừng {playerName} lập đại công với {giftName}, vinh thăng {rankName}!',
  'Hộ Pháp mau mang ấn tín ra đây! Sắc phong {playerName} lên ngôi vị {rankName} nhờ công đức hiến tặng {giftName}!',
  'Ánh kim quang chói lọi! {playerName} vừa nhận sắc chỉ của bổn tọa, chính thức bước lên hàng {rankName}!',
  'Đúng là đệ tử xuất chúng của Ma Giáo! {playerName} dâng {giftName}, danh vị {rankName} từ nay vang danh thiên hạ!',
  'Trống lớn nổi lên ba hồi! Mừng {playerName} đột phá lên phẩm hàm {rankName}, uy trấn cả một góc đại điện!',
  'Bổn tọa vô cùng đẹp lòng trước {giftName} của {playerName}! Thưởng ngay bộ chiến bào mới cùng danh hiệu {rankName}!',
  'Cả sảnh mau nhìn kìa! {playerName} vừa thay đổi xiêm y lộng lẫy, chính thức trở thành bậc {rankName} của bổn giáo!',
  'Tốc độ thăng tiến của {playerName} làm bổn tọa cũng phải kinh ngạc! Vừa tặng {giftName} đã vươn lên {rankName}!',
  'Ngân khố Ma Giáo thêm phần rực rỡ nhờ {giftName}! Phong thưởng {playerName} lên ngay cấp bậc {rankName}!',
  'Không hổ danh là nhân trung chi long! {playerName} nay đã đứng vào hàng ngũ {rankName}, các đệ tử mau chúc mừng!',
  'Linh khí hội tụ quanh người {playerName}! Nhờ lễ vật {giftName}, đạo hạnh tăng vọt lên cảnh giới {rankName}!',
  'Bổn tọa phất tay ban thưởng: {playerName} nhận danh hiệu {rankName}, địa vị trong Ma Giáo tăng lên một bậc lớn!',
  'Kính贺 {playerName}! Một phần {giftName} trao tay, chức vị {rankName} đã thuộc về ngươi một cách xứng đáng!',
  'Nhìn hào quang dưới chân {playerName} xem! Đó chính là dấu hiệu của bậc {rankName} vừa được sắc phong!',
  'Từ nay trong Đại Điện Ma Giáo, ai gặp {playerName} đều phải gọi một tiếng {rankName} đầy kính trọng!',
  'Hào khí ngất trời! {playerName} dùng {giftName} mở đường công danh, thẳng tiến lên ngôi vị {rankName}!',
  'Bổn tọa tuyên đọc thánh chỉ tà phái: chuẩn cho {playerName} thăng cấp {rankName}, ban thưởng khí chất bá vương!',
  'Quá đỗi tuyệt vời! {playerName} vừa cống hiến {giftName}, lập tức được ghi danh vào bảng vàng cấp bậc {rankName}!',
  'Gió mây chuyển sắc mừng {playerName} tấn cấp! Chức vị {rankName} này sinh ra chính là để dành cho ngươi!',
  'Đệ tử toàn giáo học tập {playerName} kìa! Dâng {giftName} đầy nghĩa khí, nay đã đường hoàng làm bậc {rankName}!',
  'Một bước lên mây! {playerName} từ nay khoác lên mình vinh quang của {rankName}, uy phong lẫm liệt giữa chính điện!',
  'Bổn tọa vừa đóng đại ấn Ma Tôn lên lệnh bài {rankName} trao tận tay cho {playerName}!',
  'Nhờ {giftName} quý giá, nội lực của {playerName} đã thông suốt kỳ kinh bát mạch, đạt tới danh vị {rankName}!',
  'Pháo hoa tinh thần nổ vang! Chúc mừng {playerName} bước lên nấc thang quyền lực mới: {rankName}!',
  'Tài lực và tâm huyết của {playerName} qua món quà {giftName} thật đáng nể, phong ngay chức {rankName} không cần bàn cãi!',
  'Đại Điện Ma Giáo hôm nay rạng danh nhờ có {playerName} thăng tiến lên bậc {rankName}!',
  'Hãy nhìn bộ trang phục mới toanh của {playerName}! Đúng chuẩn phong phạm của một bậc {rankName} chân chính!',
  'Bổn tọa gật đầu liên tục! {playerName} tặng {giftName} quá hợp ý, chức {rankName} trao cho ngươi là chuẩn xác trăm phần trăm!',
  'Danh chấn giang hồ! {playerName} vừa ghi tên mình vào hàng ngũ {rankName} cao quý của Thiên Hạ Đệ Nhất Tà Phái!',
  'Sắc lệnh đã ban ra không thể thu hồi: {playerName} vĩnh viễn ghi dấu mốc thăng cấp {rankName} trong phiên hội hôm nay!',
  'Hộ Pháp hai bên mau nghiêng mình! {playerName} vừa tiếp nhận chức vị {rankName} sau khi dâng {giftName}!',
  'Chúc mừng {playerName}! Có thêm một bậc {rankName} tài ba như ngươi, thanh thế Ma Giáo lại tăng gấp bội!',
  'Ánh sáng tím huyền bí bao phủ lấy {playerName}, hoàn tất nghi thức tấn phong lên phẩm vị {rankName}!',
  'Không cần đợi tu luyện mười năm, {playerName} chỉ cần một chiêu {giftName} đã đắc đạo thành {rankName}!',
  'Bổn tọa xin dành tràng pháo tay vang dội nhất cho tân {rankName} mang tên {playerName}!',
  'Uy danh của {playerName} đang lan tỏa khắp sảnh! Chức sắc {rankName} vừa được ban xuống từ ngai cao!',
  'Thật là mở mang tầm mắt! {playerName} hào phóng trao {giftName}, lập tức nhận lấy quyền trượng danh vọng {rankName}!',
  'Trong lịch sử bổn giáo, hiếm ai thăng lên {rankName} đầy khí phách như {playerName} vừa làm hôm nay!',
  'Mừng tân {rankName} {playerName}! Chúc ngươi sớm ngày tiếp tục vươn tới đỉnh cao quyền lực trong Ma Giáo!',
  'Lệnh bài bằng vàng ròng khắc chữ {rankName} đã được trao cho {playerName} vì công lao dâng {giftName}!',
  'Khí chất của {playerName} sau khi lên chức {rankName} quả nhiên khác hẳn, đứng đâu cũng tỏa sáng rực rỡ!',
  'Bổn tọa lấy làm tự hào khi dưới trướng có thêm bậc {rankName} hào kiệt như {playerName}!',
  'Tiếng reo hò vang dậy bốn phía đại điện chúc mừng {playerName} chính thức đạt cấp {rankName}!',
  'Món quà {giftName} vừa xuất hiện, thiên tượng báo điềm lành, {playerName} lập tức đăng đàn nhận chức {rankName}!',
  'Đường tới đỉnh cao võ lâm của {playerName} đang rộng mở thênh thang với danh hiệu mới: {rankName}!',
  'Bổn tọa ban rượu mừng tinh thần! Chúc mừng {playerName} vinh quy bái tổ trong phẩm phục {rankName} lẫy lừng!'
];

// ============================================================================
// 4. TƯƠNG TÁC ĐỒ ĐỆ – 40 CÂU RIÊNG BIỆT (disciple_interact)
// ============================================================================
const DISCIPLE_INTERACT_TEXTS: string[] = [
  'Này {playerName}, ta thấy ngươi đi qua đi lại nãy giờ, đang tìm chỗ giấu bánh bao hay đang luyện Lăng Ba Vi Bộ thế?',
  'Khá khen cho {playerName}! Cú đấm vừa rồi rất có lực, làm bay luôn mấy hạt bụi trước mặt bổn tọa!',
  'Ô kìa {playerName}, ngồi thiền nhập định chăm chú quá nhỉ, đừng có nhân cơ hội nhắm mắt ngủ gật đấy nhé!',
  'Thân pháp của {playerName} lúc chạy quanh đại điện nhìn rất linh hoạt, giống hệt lúc nghe tiếng kẻng báo giờ ăn cơm!',
  'Bổn tọa đang quan sát {playerName} tập võ dưới sảnh, động tác dứt khoát đấy, thưởng cho một lời khen vàng ngọc!',
  'Này {playerName}, đứng ở bậc {rankName} mà tạo dáng ngầu quá mức quy định là coi chừng đẹp trai hơn bổn tọa đấy!',
  'Hay lắm {playerName}! Cú đá xoay người vừa rồi chuẩn xác từng phân, lá cây ngoài sân cũng phải bay theo nhịp!',
  'Ta thấy {playerName} vừa cúi chào rất lễ phép, đúng là đồ đệ ngoan hiền bậc nhất trong lòng bổn tọa!',
  'Đệ tử {playerName} hôm nay tràn đầy năng lượng nhỉ, múa quyền liên hoàn không biết mệt là gì luôn!',
  'Ngươi nhìn {playerName} kìa, vừa nhảy lên không trung một cú nhẹ tựa lông hồng, khinh công tiến bộ vượt bậc!',
  'Bổn tọa chấm cho bài quyền vừa rồi của {playerName} chín điểm rưỡi, nửa điểm còn lại giữ để ngươi khỏi kiêu ngạo!',
  'Này {playerName}, tập võ xong nhớ uống miếng nước nghỉ ngơi, giữ sức lát nữa còn bước vào kỳ sát hạch toàn giáo!',
  'Trong hàng ngũ {rankName} hôm nay, {playerName} là người chăm chỉ vận động tay chân nhất mà bổn tọa nhìn thấy!',
  'Ái chà, {playerName} vừa tung một bộ liên hoàn cước cực kỳ đẹp mắt, các đồng môn xung quanh mau học hỏi kìa!',
  'Bổn tọa ngồi trên ngai nhìn xuống thấy {playerName} đang đứng mỉm cười, chắc đang ấp ủ kế hoạch lên chức lớn đây!',
  'Tốc độ di chuyển của {playerName} giữa các khu vực đại điện thật đáng nể, thoắt ẩn thoắt hiện như ma ảnh!',
  'Giỏi lắm {playerName}! Nghe lệnh bình luận một cái là thực hiện động tác chuẩn không cần chỉnh ngay lập tức!',
  'Này {playerName}, bộ y phục {rankName} ngươi đang mặc nhìn rất hợp dáng, đi đứng trong sảnh trông oai phong hẳn!',
  'Ta vừa thấy {playerName} vỗ tay cổ vũ đồng môn, tinh thần đoàn kết của Ma Giáo chính là nằm ở chỗ này!',
  'Cẩn thận kẻo chóng mặt nhé {playerName}, nãy giờ ta thấy ngươi xoay người múa võ ba vòng liên tiếp rồi đấy!',
  'Khí tức của {playerName} hôm nay rất ổn định, ngồi thiền ở góc tĩnh tâm mà hào quang cứ tỏa ra đều đặn!',
  'Bổn tọa đặc biệt tuyên dương {playerName} vì tinh thần hăng hái phát biểu làm không khí đại điện sôi động!',
  'Nhìn {playerName} tung quyền kìa, gió thổi bay cả dải lụa treo trên cột rồng, nội lực không phải dạng vừa đâu!',
  'Này {playerName}, đứng gần lối đi chính nhớ giữ tư thế uy nghiêm để người mới vào còn trầm trồ ngưỡng mộ nhé!',
  'Một pha bật nhảy cực cao từ vị trí của {playerName}! Xứng đáng nhận được cái gật đầu tán thưởng của Giáo Chủ!',
  'Đệ tử {playerName} quả nhiên danh bất hư truyền, mỗi bước đi trên nền đá đại điện đều toát lên vẻ tự tin!',
  'Ta để ý thấy {playerName} rất hay luyện võ ở khu thảm tập, chẳng mấy chốc sẽ trở thành cao thủ hàng đầu bổn giáo!',
  'Haha, {playerName} vừa làm động tác chào bổn tọa lần thứ ba trong ngày, lễ nghĩa chu toàn thế này ai mà chê được!',
  'Cố lên {playerName} ơi! Từ vị trí {rankName} hiện tại, chỉ cần thêm chút cơ duyên là bước lên hàng trưởng lão ngay!',
  'Dáng đứng khoanh tay của {playerName} nhìn rất ra dáng đại hiệp giang hồ, bổn tọa nhìn mà cũng thấy mát lòng!',
  'Này {playerName}, khi nào rảnh nhớ chỉ lại vài đường quyền cơ bản cho mấy đệ tử mới vừa bước vào cổng nhé!',
  'Sức bền của {playerName} thật đáng kinh ngạc, chạy dọc sảnh từ nam chí bắc mà hơi thở vẫn đều như vắt chanh!',
  'Bổn tọa vừa thấy bong bóng bình luận của {playerName} hiện lên, lời lẽ hào sảng đúng chất người trong Ma Giáo!',
  'Tuyệt lắm {playerName}! Động tác đứng dậy sau khi thiền định rất dứt khoát, thần thái minh mẫn rạng ngời!',
  'Trong số tám mươi đệ tử đang hiện diện, {playerName} luôn biết cách làm mình nổi bật bằng những chiêu võ đẹp mắt!',
  'Này {playerName}, đừng đứng gần cột rồng đấm mạnh quá kẻo tróc sơn золотой của bổn tọa vừa mới quét hôm qua!',
  'Ta thấy {playerName} vừa né sang một bên rất điệu nghệ, phản xạ nhanh nhạy thế này vào mini game chắc chắn thắng lớn!',
  'Đệ tử {playerName} mang danh {rankName} quả thực làm rạng rỡ môn phong, cử chỉ hành động đều rất có chừng mực!',
  'Mỗi lần {playerName} xuất chiêu là không khí quanh đó lại rộn ràng hẳn lên, tiếp tục phát huy nhé đồ đệ!',
  'Bổn tọa ghi nhận sự hiện diện đầy nhiệt huyết của {playerName} tại Đại Điện hôm nay, thưởng một trăm điểm tinh thần!'
];

// ============================================================================
// 5. ĐIỀU HÀNH MINI GAME – 40 CÂU RIÊNG BIỆT (minigame_host)
// ============================================================================
const MINIGAME_HOST_TEXTS: string[] = [
  'Trống lệnh đã điểm! Toàn bộ đệ tử mau di chuyển sang Sân Luyện Võ để bắt đầu khảo hạch {gameName}!',
  'Giờ khắc sát hạch đã tới! Bổn tọa đích thân chủ trì {gameName}, ai lười biếng sẽ được nhận vé quét sân miễn phí!',
  'Cả sảnh nghe rõ đây: kỳ thi {gameName} chính thức khai màn, hãy nhìn kỹ luật chơi trên bảng thông báo!',
  'Mau tập hợp đội hình tại Sân Luyện Võ! Trong {gameName} lần này, bổn tọa muốn thấy sự đồng lòng của toàn giáo!',
  'Đừng đứng ngơ ngác nữa các đồ đệ! {gameName} đã bắt đầu đếm ngược, mau gõ từ khóa vào khung bình luận!',
  'Đối với Ma Quyền Loạn Vũ, mỗi đệ tử chỉ cần bình luận chữ MÚA đúng một lần trong lượt này để góp sức qua ải!',
  'Ma Ảnh Thân Pháp bắt đầu rồi! Nhìn hướng chướng ngại vật lao tới mà gõ TRÁI, PHẢI hoặc NHẢY cho kịp thời gian nhé!',
  'Tam Khí Ma Trận đã khai mở! Nhớ quy tắc tương khắc: LỬA thắng BĂNG, BĂNG thắng GIÓ, và GIÓ thắng LỬA!',
  'Thời gian đang trôi rất nhanh! Đệ tử nào chưa xuất chiêu trong {gameName} thì mau tay bình luận ngay đi nào!',
  'Bổn tọa đang đứng trên đài cao quan sát từng người một trong {gameName}, đừng để ta phải ghi tên vào sổ phạt quét lá!',
  'Khí thế lên cao nào! Chỉ cần sáu mươi phần trăm đệ tử hoàn thành là cả đội sẽ giành chiến thắng trong {gameName}!',
  'Hiệp mới của {gameName} vừa mở ra! Tập trung tinh thần, nhìn kỹ hiệu lệnh của bổn tọa rồi mới tung chiêu!',
  'Ai đã hoàn thành lượt của mình trong {gameName} hãy đứng cổ vũ cho các đồng môn còn lại mau chóng vượt ải!',
  'Cẩn thận đấy! Trong Ma Ảnh Thân Pháp, chậm một nhịp là vấp ngã ngay trên sân đá luyện võ!',
  'Nhìn kỹ luồng ma khí mà bổn tọa vừa tung ra! Chọn đúng nguyên tố khắc chế để phá giải Tam Khí Ma Trận!',
  'Còn mười giây cuối cùng của {gameName}! Các cao thủ Ma Giáo đâu hết rồi, mau xuất tuyệt kỹ cứu nguy cho toàn đội!',
  'Đừng để cái chổi tre ở góc sân vẫy gọi tên mình! Mau gõ đúng từ khóa của {gameName} để hoàn thành bài khảo hạch!',
  'Sân Luyện Võ đang rung chuyển bởi khí thế của {gameName}! Bổn tọa rất mong chờ kết quả của lượt thi này!',
  'Nhắc lại lần nữa: trong Ma Quyền Loạn Vũ không cần gõ liên tục, mỗi người một lệnh MÚA là đã tính hoàn thành!',
  'Chướng ngại vật hiệp tiếp theo đang lao tới rất nhanh! TRÁI, PHẢI hay NHẢY, quyết định ngay trong chớp mắt!',
  'Bổn tọa vừa đổi thuộc tính chưởng lực trong Tam Khí Ma Trận, mau nhìn biểu tượng trên màn hình để khắc chế!',
  'Tỷ lệ hoàn thành của toàn đội đang tăng lên từng giây! Cố thêm chút nữa là vượt qua thử thách {gameName} rồi!',
  'Những đệ tử đang đứng ở rìa sân chú ý! Đã bước vào Sân Luyện Võ là phải tham gia {gameName} cho khí thế!',
  'Hộ Pháp đang cầm sổ điểm danh ngay bên cạnh bổn tọa, ai đứng im trong {gameName} là lộ diện ngay lập tức!',
  'Một bài kiểm tra phản xạ và tinh thần đồng đội mang tên {gameName} đang diễn ra, hãy chứng minh thực lực của các ngươi!',
  'Hay lắm, đã có nhiều đệ tử tung chiêu thành công trong {gameName}, những người còn lại mau nối gót theo sau!',
  'Gió núi đang thổi mạnh trên Sân Luyện Võ, tiếp thêm uy lực cho các đệ tử đang thi triển {gameName}!',
  'Chỉ còn vài phần trăm nữa là đạt ngưỡng chiến thắng của {gameName}, ai chưa bình luận hãy ra tay ngay!',
  'Trong Tam Khí Ma Trận, chọn sai nguyên tố sẽ bị dội ngược khí lực, hãy suy nghĩ thật chuẩn trước khi gõ lệnh!',
  'Hiệp cuối cùng quyết định thành bại của {gameName} đã bắt đầu, toàn giáo dồn hết tâm lực vào chiêu này!',
  'Bổn tọa đã chuẩn sẵn phần thưởng tinh thần cho đội thắng, và cũng chuẩn bị sẵn năm cây chổi mới cho đội thua!',
  'Nhịp độ của {gameName} đang ở mức gay cấn nhất, từng bình luận của các ngươi đều quyết định cục diện trận đấu!',
  'Hãy cho thiên hạ thấy đệ tử Ma Giáo không chỉ biết nói chuyện vui vẻ mà khi vào {gameName} cũng cực kỳ thiện chiến!',
  'Chú ý thanh thời gian trên đỉnh màn hình! Đừng để hết giờ mới tiếc nuối vì chưa kịp gõ lệnh trong {gameName}!',
  'Những bước nhảy và pha né đòn trong {gameName} nhìn từ trên đài cao xuống thật sự vô cùng mãn nhãn!',
  'Toàn bộ hàng ngũ {rankName} hãy làm gương dẫn đầu trong thử thách {gameName} lần này cho đàn em noi theo!',
  'Bổn tọa đang vận công duy trì trận pháp {gameName}, các đệ tử dưới sân hãy mau chóng tìm ra mắt trận!',
  'Tiếng hô vang dội khắp Sân Luyện Võ! Chỉ còn vài giây nữa là khép lại màn so tài {gameName} đầy kịch tính!',
  'Ai muốn giữ trọn phong độ soái ca mỹ nữ trong đại điện thì nhớ hoàn thành xuất sắc bài thi {gameName} này nhé!',
  'Thời khắc phán quyết của {gameName} sắp điểm, bổn tọa chuẩn bị công bố danh sách vinh danh và danh sách quét sân!'
];

// ============================================================================
// 6. NHẬN XÉT KHI THẮNG MINI GAME – 30 CÂU RIÊNG BIỆT (minigame_win)
// ============================================================================
const MINIGAME_WIN_TEXTS: string[] = [
  'Haha! Tuyệt vời! Toàn giáo đồng lòng vượt qua {gameName} một cách ngoạn mục, bổn tọa vô cùng tự hào!',
  'Đúng là đệ tử chân truyền của Thiên Hạ Đệ Nhất Tà Phái! Chiến thắng trong {gameName} hôm nay thật xứng đáng!',
  'Tỷ lệ hoàn thành vượt xa kỳ vọng! Màn trình diễn trong {gameName} vừa rồi làm chấn động cả vùng núi Ma Sơn!',
  'Khá lắm các đồ đệ! Không một ai phải cầm chổi quét sân trong lượt {gameName} này, tất cả đều xứng đáng nhận thưởng!',
  'Bổn tọa đứng trên đài cao nhìn xuống mà mãn nhãn vô cùng, {gameName} đã bị các ngươi chinh phục hoàn toàn!',
  'Tinh thần đoàn kết của Ma Giáo là bất khả chiến bại! Chúc mừng toàn sảnh đã đại thắng trong thử thách {gameName}!',
  'Nhanh, mạnh, chuẩn xác! Đó chính là những gì các ngươi vừa thể hiện để giành lấy thắng lợi ở {gameName}!',
  'Hộ Pháp đâu, mở tiệc trà bánh tinh thần khao quân! Đệ tử chúng ta vừa hoàn thành xuất sắc kỳ sát hạch {gameName}!',
  'Chánh phái mà nhìn thấy cảnh tượng đồng đều của Ma Giáo trong {gameName} vừa rồi chắc chắn phải tâm phục khẩu phục!',
  'Một tràng pháo tay vang dội cho tất cả những người đã kịp thời xuất chiêu mang về chiến thắng {gameName}!',
  'Nội lực của toàn giáo hôm nay hòa làm một, phá tan mọi thử thách khó nhằn nhất của {gameName}!',
  'Bổn tọa gật đầu hài lòng! Có đội ngũ đệ tử tinh nhuệ thế này, ngôi vị bá chủ võ lâm chẳng còn xa nữa!',
  'Không uổng công bổn tọa ngày đêm chỉ dạy, các ngươi xử lý tình huống trong {gameName} cực kỳ điêu luyện!',
  'Thắng lợi vẻ vang! Cả Sân Luyện Võ ngập tràn tiếng reo hò mừng kỳ tích vượt ải {gameName} thành công!',
  'Những pha xuất chiêu cuối cùng vừa kịp lúc đã giúp toàn đội lật ngược thế cờ ngoạn mục trong {gameName}!',
  'Hôm nay năm cây chổi ở góc sân được nghỉ ngơi hoàn toàn nhờ chiến thắng tuyệt đối của các ngươi tại {gameName}!',
  'Khí thế chiến thắng từ {gameName} sẽ theo chúng ta trở về Đại Điện, ai nấy đều rạng rỡ uy phong!',
  'Bổn tọa chấm điểm mười tròn trĩnh cho sự phối hợp ăn ý của toàn bộ đệ tử trong màn thử lửa {gameName}!',
  'Từ tân đồ đệ cho tới các bậc trưởng lão đều ra tay rất đúng nhịp, tạo nên khúc khải hoàn cho {gameName}!',
  'Quá xuất sắc! Phản xạ của các ngươi trong {gameName} nhanh như chớp giật giữa trời đêm!',
  'Trận pháp {gameName} dù biến hóa khôn lường cũng không làm khó được trí tuệ và bản lĩnh của đệ tử Ma Giáo!',
  'Mừng đại thắng! Mau chỉnh đốn lại trang phục để cùng bổn tọa hiên ngang bước về Đại Điện chính!',
  'Một kỷ lục mới về tốc độ đồng lòng vừa được thiết lập tại Sân Luyện Võ trong kỳ thi {gameName}!',
  'Bổn tọa cười tươi hết cỡ rồi đây! Nhìn các đồ đệ ăn mừng chiến thắng {gameName} mà lòng ta phơi phới!',
  'Sự nhạy bén của các ngươi khi khắc chế từng hiệp trong {gameName} quả thực đạt tới trình độ thượng thừa!',
  'Không hổ danh là những chiến binh ưu tú nhất dưới trướng Dạ Thiên Minh, {gameName} đã khép lại với thắng lợi rực rỡ!',
  'Hào quang chiến thắng đang tỏa sáng khắp Sân Luyện Võ, chúc mừng toàn thể môn nhân đã vượt qua {gameName}!',
  'Mỗi một bình luận đúng lúc của các ngươi là một viên gạch xây nên đài chiến thắng {gameName} hôm nay!',
  'Bổn tọa tuyên bố: kỳ sát hạch {gameName} kết thúc mỹ mãn, toàn quân ca khúc khải hoàn trở về đại sảnh!',
  'Giỏi lắm, giỏi lắm! Giữ vững phong độ đỉnh cao này cho những kỳ khảo hạch {gameName} tiếp theo nhé các đồ đệ!'
];

// ============================================================================
// 7. NHẬN XÉT KHI THUA MINI GAME – 30 CÂU RIÊNG BIỆT (minigame_lose)
// ============================================================================
const MINIGAME_LOSE_TEXTS: string[] = [
  'Ái chà chà! Thiếu một chút xíu sự đồng lòng nữa thôi là qua ải {gameName} rồi, tiếc quá đi mất!',
  'Kỳ sát hạch {gameName} lần này chưa đạt ngưỡng yêu cầu rồi! Đành phải chọn ra tối đa năm đệ tử đi quét sân thôi!',
  'Này nhé, bổn tọa đứng trên đài thấy có mấy người mải ngắm cảnh không chịu gõ lệnh trong {gameName} đấy nhé!',
  'Thua keo này ta bày keo khác! Nhưng trước tiên mấy đệ tử lơ là trong {gameName} mau ra góc sân nhận chổi tre nào!',
  'Không sao cả, {gameName} hôm nay coi như bài tập làm nóng người, ai bị phạt quét lá chỉ cần bình luận lại là được về sảnh ngay!',
  'Nhìn năm bóng dáng đang lom khom cầm chổi quét lá sau khi trượt {gameName} kìa, vừa thương vừa buồn cười!',
  'Bổn tọa đã dặn kỹ luật chơi {gameName} rồi mà vẫn có người bấm nhầm hướng, làm cả đội lỡ mất chiến thắng!',
  'Góc sân quét lá hôm nay lại có khách quý ghé thăm sau màn thử thách {gameName} đầy sóng gió!',
  'Nhớ kỹ nhé các đồ đệ đang quét sân: không bị trừ công trạng hay hạ cấp đâu, chỉ cần gõ một câu bình luận bất kỳ là hết phạt ngay!',
  'Thất bại trong {gameName} chỉ là tạm thời, nhưng cảnh tượng cao thủ Ma Giáo đi quét lá rơi thì đúng là hiếm có khó tìm!',
  'Hộ Pháp đâu, phát chổi tre loại tốt nhất cho mấy đệ tử chưa kịp hoàn thành {gameName} tập cơ tay vài phút nào!',
  'Chỉ thiếu đúng vài cánh tay nữa thôi là {gameName} đã thành công mỹ mãn rồi, lần sau toàn giáo nhớ tập trung hơn nhé!',
  'Bổn tọa thở dài một tiếng đầy kịch tính! {gameName} khép lại mà chưa đạt sáu mươi phần trăm, phạt nhẹ cho nhớ bài thôi!',
  'Quét sân cũng là một môn tu luyện tâm tính của Ma Giáo! Mấy đồ đệ trượt {gameName} cứ quét vài đường cho sạch sân nhé!',
  'Ai đang ở khu vực quét lá muốn quay lại Đại Điện ngay lập tức thì chỉ việc lên tiếng trong khung trò chuyện thôi nào!',
  'Trận pháp {gameName} hôm nay hơi hiểm hóc một chút khiến đội hình chúng ta bị rối nhịp ở những giây cuối cùng!',
  'Đừng buồn vì kết quả {gameName}, thắng bại là chuyện thường tình của nhà binh, quét sạch mấy chiếc lá rồi vào tập tiếp!',
  'Bổn tọa nhìn danh sách năm người đi quét sân sau {gameName} mà không nhịn được cười, toàn những gương mặt thân quen!',
  'Lần tới khi nghe trống hiệu {gameName}, nhớ bỏ bát mì xuống gõ một lệnh trước rồi ăn tiếp cho khỏi phải đi quét sân nhé!',
  'Sân luyện võ nhờ có đội hình trượt {gameName} mà sạch bóng không còn một cọng rác, kể ra cũng có công đóng góp cho bổn giáo!',
  'Một pha sẩy chân đáng tiếc của tập thể trong {gameName}, rút kinh nghiệm sâu sắc cho chu kỳ khảo hạch sau!',
  'Này mấy đệ tử đang cầm chổi, quét xong nhớ gõ một câu báo cáo bổn tọa để ta đón về sảnh chính ngay nhé!',
  'Thử thách {gameName} khép lại với bài học nhớ đời: đoàn kết thì đứng giữa điện, lơ đễnh thì đứng góc sân!',
  'Bổn tọa tuyên bố hình phạt của {gameName} hoàn toàn mang tính giải trí rèn luyện, cấp bậc và công trạng vẫn giữ nguyên vẹn!',
  'Nhìn dáng quét sân của đệ tử Ma Giáo cũng phải thật ngầu, dù trượt {gameName} nhưng thần thái không được phép giảm sút!',
  'Chắc do gió núi hôm nay thổi ngược chiều nên các ngươi mới xuất chiêu chậm một nhịp trong {gameName} phải không?',
  'Không ai bị bỏ lại phía sau! Mấy đồng môn đang chịu phạt sau {gameName} mau bình luận một câu để hội quân cùng đại sảnh!',
  'Kỳ thi {gameName} lần này coi như bổn tọa kiểm tra độ chăm chỉ dọn vệ sinh sân bãi của các ngươi vậy!',
  'Hãy ghi nhớ khoảnh khắc này để đến vòng {gameName} tiếp theo, toàn giáo sẽ phục thù bằng một chiến thắng vang dội!',
  'Về lại Đại Điện thôi nào, còn năm vị đại hiệp quét sân sau {gameName} thì cứ bình luận một tiếng là bước vào sảnh ngay nhé!'
];

// ============================================================================
// 8. TƯƠNG TÁC TRƯỞNG LÃO & ĐỒNG TÔN GIÁO CHỦ – 20 CÂU (elder_coleader)
// ============================================================================
const ELDER_COLEADER_TEXTS: string[] = [
  'Kính mời Đồng Tôn Giáo Chủ {playerName} an tọa trên đài cao bên cạnh ngai vàng, cùng bổn tọa thống lĩnh thiên hạ!',
  'Đại Trưởng Lão {playerName} uy chấn bốn phương, đứng ở hàng đầu đại điện làm rạng danh toàn bộ Ma Giáo!',
  'Có Đồng Tôn Giáo Chủ {playerName} sánh vai trên bục danh dự, thanh thế của bổn giáo hôm nay tăng lên gấp mười lần!',
  'Hãy nhìn phong thái đĩnh đạc của bậc {rankName} {playerName} kìa, đúng là trụ cột vững chắc của Thiên Hạ Đệ Nhất Tà Phái!',
  'Bổn tọa nâng chén trà bích loa xuân kính {playerName}, cảm tạ bậc {rankName} đã hết lòng phò tá cơ đồ Ma Giáo!',
  'Bảng vàng Trưởng Lão hôm nay ghi đậm danh tính của {playerName}, người khiến cả giang hồ phải ngước nhìn ngưỡng mộ!',
  'Đồng Tôn Giáo Chủ {playerName} ngồi trên đài phụ cận ngai rồng, quyền uy chỉ đứng sau một người mà trên vạn người!',
  'Mỗi lời bình luận của bậc {rankName} {playerName} đều mang sức nặng ngàn cân giữa chốn Đại Điện trang nghiêm!',
  'Hộ Pháp và Đại Trưởng Lão {playerName} đang trấn giữ khu vực trọng yếu nhất của sảnh, tà khí hộ thể rực sáng!',
  'Bổn tọa rất yên tâm mỗi khi nhìn sang bên cạnh thấy {playerName} đang mang danh vị {rankName} cao quý!',
  'Toàn thể đệ tử nội ngoại môn mau chắp tay hành lễ trước bậc trưởng bối {rankName} mang tên {playerName}!',
  'Chiến bào thêu kim tuyến của {playerName} ở cấp bậc {rankName} quả thực là báu vật hiếm có trong võ lâm!',
  'Nhờ sự hiện diện của những bậc {rankName} kiệt xuất như {playerName} mà ngọn lửa Ma Giáo luôn bừng cháy bất diệt!',
  'Đồng Tôn Giáo Chủ {playerName} hôm nay thần thái ngời ngời, cùng bổn tọa duyệt binh tám mươi đệ tử dưới sảnh!',
  'Danh sách bốn vị Trưởng Lão tối cao đang gọi tên {playerName}, niềm tự hào to lớn của đại gia đình Ma Giáo!',
  'Bổn tọa đặc cách ban cho {playerName} ở ngôi vị {rankName} quyền ưu tiên xuất hiện rực rỡ nhất trước toàn quân!',
  'Ngồi trên đài cao mới thấy hết giang sơn cẩm tú, đúng không hả vị {rankName} đáng kính {playerName} của bổn tọa?',
  'Cổ cầm ngân vang khúc nhạc tôn vinh bậc {rankName} {playerName}, người đã góp công lớn xây dựng đại điện nguy nga này!',
  'Ai muốn biết thế nào là đỉnh cao phong độ của bậc {rankName} thì cứ nhìn thẳng vào vị trí của {playerName}!',
  'Bổn tọa cùng Đồng Tôn Giáo Chủ và các vị Đại Trưởng Lão như {playerName} xin chúc toàn sảnh một buổi hội tụ đại cát!'
];

// ============================================================================
// 9. KHI SẢNH VẮNG – 20 CÂU RIÊNG BIỆT (quiet_hall)
// ============================================================================
const QUIET_HALL_TEXTS: string[] = [
  'Đại Điện hôm nay yên tĩnh thế nhỉ, các đồ đệ của bổn tọa đang bận bế quan luyện công hay đang bận ăn tối hết rồi?',
  'Ai đang đi ngang qua cổng Ma Giáo thì mau gõ một câu bình luận bước vào sảnh trò chuyện cùng bổn tọa cho vui nào!',
  'Bổn tọa ngồi trên ngai vàng hơi buồn tay rồi đấy, có vị thiếu hiệp nào muốn vào đây thử vài đường quyền không?',
  'Không khí tĩnh lặng thế này làm bổn tọa lại muốn kể thêm vài chiến tích tà đạo ngớ ngẩn cho mọi người nghe!',
  'Cổng sơn trang vẫn đang mở rộng, chỉ cần một lời chào trong khung bình luận là ngươi sẽ hóa thân thành đệ tử ngay!',
  'Này các đồ đệ đang đứng trong sảnh, ai còn thức thì gõ lệnh võ hoặc múa cho đại điện rộn ràng lên xem nào!',
  'Đèn lồng đỏ vẫn lung linh, khói hương tím vẫn bay lượn, chỉ chờ thêm tiếng nói cười của các hào kiệt bốn phương!',
  'Bổn tọa vừa pha ấm trà mới thơm lừng, có ai muốn vào Đại Điện Ma Giáo đàm đạo chuyện thiên hạ cùng ta không?',
  'Yên ắng quá là bổn tọa bắt đầu ngáp dài trên ngai vàng đấy nhé, mau bình luận khuấy động phong trào đi nào!',
  'Hộ Pháp hai bên đứng nghiêm trang suốt từ nãy tới giờ, đang chờ đón những bước chân tân đệ tử tiếp theo tiến vào!',
  'Giang hồ ngoài kia ồn ào xô bồ, chi bằng ghé vào Ma Giáo của bổn tọa vừa tập võ vừa nghe chuyện tiếu lâm!',
  'Chỉ một bình luận duy nhất để ghi danh vào sổ vàng tám mươi đệ tử, cơ hội hành tẩu giang hồ đang ở ngay trước mắt!',
  'Bổn tọa đang nhẩm lại ba mươi lăm tuyệt kỹ trấn phái, ai muốn xem ta biểu diễn chiêu nào thì cứ lên tiếng nhé!',
  'Sảnh vắng thế này mà có người dâng quà thăng chức là bổn tọa đọc tên vang dội khắp chín tầng mây luôn!',
  'Có vẻ các cao thủ đang ẩn mình quan sát từ xa, đừng ngại ngần nữa, bước qua cổng đá vào sảnh với bổn tọa đi!',
  'Gió thu thổi nhẹ qua mái ngói lưu ly, bổn tọa chống cằm chờ đợi nhân tài xuất thế tại Đại Điện Ma Giáo!',
  'Đệ tử nào đang đứng nghỉ chân dưới sảnh hãy thử gõ lệnh chạy hoặc nhảy để khởi động trước kỳ sát hạch sắp tới!',
  'Dù sảnh đông hay vắng thì uy nghiêm của Thiên Hạ Đệ Nhất Tà Phái vẫn luôn tỏa sáng rực rỡ từng giây từng phút!',
  'Một câu chào mở đầu câu chuyện, biết đâu hôm nay ngươi lại trở thành Tân Giáo Chủ thống lĩnh cả đại điện này!',
  'Bổn tọa vừa phất tay áo triệu hồi linh khí, mời tất cả bằng hữu gần xa cùng bước vào Đại Điện chung vui!'
];

// ============================================================================
// 10. CHUYỂN GIAO NGAI & SỰ KIỆN ĐẶC BIỆT – 20 CÂU (throne_transfer)
// ============================================================================
const THRONE_TRANSFER_TEXTS: string[] = [
  'Thiên địa chấn động! {playerName} vừa xuất bảo vật chí tôn {giftName}, chính thức đăng cơ làm Tân Giáo Chủ Ma Giáo!',
  'Toàn giáo quỳ lạy nghênh đón Tân Giáo Chủ {leaderName}! Từ giờ phút này, ngai vàng tối cao đã có chủ nhân mới!',
  'Bổn tọa xin nhường lại ngai rồng cho {leaderName} và lui về vị trí Thái Thượng Giáo Chủ đứng bên cạnh phò tá!',
  'Kim quang vạn trượng bừng sáng đỉnh điện! Chúc mừng {leaderName} dùng {giftName} đoạt lấy ngôi vị Chí Tôn Ma Giáo!',
  'Lịch sử bổn giáo sang trang mới! Tân Giáo Chủ {leaderName} đã khoác lên mình hoàng bào Hắc Kim uy trấn thiên hạ!',
  'Trống sấm vang rền chín cõi! Bái kiến Tân Giáo Chủ {leaderName}, bậc bá chủ mới của Thiên Hạ Đệ Nhất Tà Phái!',
  'Thái Thượng Giáo Chủ ta đây vô cùng mãn nguyện khi thấy ngai vàng được trao về tay hào kiệt {leaderName}!',
  'Hộ Pháp và toàn thể tám mươi đệ tử dưới sảnh mau đồng thanh hô vang: Tân Giáo Chủ {leaderName} vạn tuế!',
  'Không ai có thể ngờ tới màn soán ngôi ngoạn mục bằng {giftName}! Ngai vàng Ma Giáo nay thuộc về {leaderName}!',
  'Ấn tín Ma Tôn và quyền trượng tối cao đã được trao tận tay Tân Giáo Chủ {leaderName} trước sự chứng kiến của toàn sảnh!',
  'Nhìn uy phong của Tân Giáo Chủ {leaderName} trên ngai cao kìa, khí chất bá vương làm cả võ lâm phải nghiêng mình!',
  'Cựu Giáo Chủ nay đã thăng làm Thái Thượng Giáo Chủ, nhường lại vị trí trung tâm rực rỡ nhất cho {leaderName}!',
  'Một kỷ nguyên huy hoàng mới của Ma Giáo chính thức bắt đầu dưới sự thống lĩnh của Tân Giáo Chủ {leaderName}!',
  'Món quà truyền thuyết {giftName} vừa giáng xuống, lập tức đưa {playerName} bước thẳng lên ngai vàng Chí Tôn!',
  'Từ một người bước qua cổng sơn trang, nay {leaderName} đã ngồi trên đỉnh cao quyền lực nhất của Đại Điện Ma Giáo!',
  'Thái Thượng Giáo Chủ xin dâng lời chúc mừng nồng nhiệt nhất tới vị chủ nhân mới của ngai vàng: {leaderName}!',
  'Cờ xí toàn giáo đồng loạt tung bay khắc tên Tân Giáo Chủ {leaderName}, danh chấn khắp cửu châu bốn bể!',
  'Quyền lực tối thượng đã tìm được chân chủ! Mọi ánh mắt trong đại điện đều đang hướng về Tân Giáo Chủ {leaderName}!',
  'Dù ở cương vị Thái Thượng Giáo Chủ, ta vẫn sẽ tiếp tục thuyết minh và ca ngợi công đức của Tân Giáo Chủ {leaderName}!',
  'Thiên mệnh đã định! Với lễ vật tối thượng {giftName}, {leaderName} chính thức trở thành Giáo Chủ đời tiếp theo của Ma Giáo Online!'
];

const DIET_MON_TEXTS: string[] = [
  'Không ổn rồi! Đại điện Ma Giáo đang rung chuyển! Là ai đã kích hoạt đại kiếp Diệt Môn kinh thiên động địa?!',
  'Trời đất ơi, cả đại điện sập thật rồi! Đồ đệ chạy đâu hết rồi?!',
  'Là {playerName}! Chính người này đã mở vòng xoáy Diệt Môn cuốn bay toàn bộ môn đồ!',
  'Tất cả môn đồ đều bị hút vào hư không! Ai còn sống mau bình luận một câu để quay lại đại điện!',
  'Đại điện đã khôi phục! Môn đồ đâu, mau xuất hiện lại cho bổn tọa điểm danh!',
  'Bá chủ Diệt Môn giáng thế! {playerName} vừa thi triển Thiên Ma Diệt Môn Đại Pháp làm sập cả trụ rồng!',
  'Giáo Chủ ta còn suýt bị hút bay mất dép! {playerName} ra tay thật là kinh thiên động địa!',
  'Vòng xoáy Ma Ấn của {playerName} đã quét sạch đại điện trong chớp mắt! Mau bình luận để tái nhập sơn môn!',
  'Tái thiết đại điện hoàn tất! Cấp bậc và tổng công trạng X của chư vị vẫn còn nguyên, mau gõ chat bước vào cổng lớn!',
  'Lịch sử Ma Giáo ghi nhận đại kiếp Diệt Môn do {playerName} khởi phát! Sảnh đường đã sẵn sàng đón anh hùng trở lại!'
];

const PERSONALITY_ROTATION: SectLeaderPersonality[] = ['ba_chu', 'hai_huoc', 'cuong_vo'];

function buildCategoryLines(
  category: DialogueCategory,
  texts: string[],
  prefix: string
): DialogueLineConfig[] {
  return texts.map((text, idx) => ({
    id: `${prefix}_${String(idx + 1).padStart(3, '0')}`,
    category,
    text,
    personality: PERSONALITY_ROTATION[idx % PERSONALITY_ROTATION.length],
    enabled: true,
  }));
}

export const DEFAULT_SECT_DIALOGUE_BANK: DialogueLineConfig[] = [
  ...buildCategoryLines('silly_evil_boast', SILLY_EVIL_BOAST_TEXTS, 'boast'),
  ...buildCategoryLines('welcome_new', WELCOME_NEW_TEXTS, 'welcome'),
  ...buildCategoryLines('promotion', PROMOTION_TEXTS, 'promo'),
  ...buildCategoryLines('disciple_interact', DISCIPLE_INTERACT_TEXTS, 'interact'),
  ...buildCategoryLines('minigame_host', MINIGAME_HOST_TEXTS, 'mg_host'),
  ...buildCategoryLines('minigame_win', MINIGAME_WIN_TEXTS, 'mg_win'),
  ...buildCategoryLines('minigame_lose', MINIGAME_LOSE_TEXTS, 'mg_lose'),
  ...buildCategoryLines('elder_coleader', ELDER_COLEADER_TEXTS, 'elder'),
  ...buildCategoryLines('quiet_hall', QUIET_HALL_TEXTS, 'quiet'),
  ...buildCategoryLines('throne_transfer', THRONE_TRANSFER_TEXTS, 'throne'),
  ...buildCategoryLines('diet_mon', DIET_MON_TEXTS, 'dietmon'),
];

export interface DialogueInterpolationContext {
  playerName?: string;
  rankName?: string;
  giftName?: string;
  leaderName?: string;
  gameName?: string;
}

/**
 * Replaces template variables `{playerName}`, `{rankName}`, `{giftName}`, `{leaderName}`, `{gameName}`
 * and strips any leftover braces so TTS never reads raw `{` or `}` aloud.
 */
export function interpolateDialogueTemplate(
  template: string,
  ctx: DialogueInterpolationContext = {}
): string {
  const safePlayer = (ctx.playerName || 'Đồ Đệ').trim();
  const safeRank = (ctx.rankName || 'Môn Nhân').trim();
  const safeGift = (ctx.giftName || 'Bảo Vật').trim();
  const safeLeader = (ctx.leaderName || 'Dạ Thiên Minh').trim();
  const safeGame = (ctx.gameName || 'Đại Hội Luyện Võ').trim();

  return template
    .replace(/\{playerName\}/g, safePlayer)
    .replace(/\{rankName\}/g, safeRank)
    .replace(/\{giftName\}/g, safeGift)
    .replace(/\{leaderName\}/g, safeLeader)
    .replace(/\{gameName\}/g, safeGame)
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Picks a dialogue line from a category while avoiding recent repeats.
 */
export function selectNonRepeatingDialogue(
  bank: DialogueLineConfig[],
  category: DialogueCategory,
  recentIds: string[],
  preferredPersonality?: SectLeaderPersonality,
  maxRecentBuffer = 25
): { line: DialogueLineConfig; updatedRecentIds: string[] } {
  const enabledInCategory = bank.filter(l => l.category === category && l.enabled);
  const pool = enabledInCategory.length > 0 ? enabledInCategory : DEFAULT_SECT_DIALOGUE_BANK.filter(l => l.category === category);

  // Filter out recently spoken IDs
  let candidates = pool.filter(l => !recentIds.includes(l.id));
  if (candidates.length === 0) {
    candidates = pool;
  }

  // Prefer matching personality 65% of the time if available
  if (preferredPersonality && Math.random() < 0.65) {
    const persMatches = candidates.filter(l => l.personality === preferredPersonality || l.personality === 'all');
    if (persMatches.length > 0) {
      candidates = persMatches;
    }
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
  const updatedRecentIds = [...recentIds.slice(-(maxRecentBuffer - 1)), chosen.id];

  return { line: chosen, updatedRecentIds };
}

export const DIALOGUE_CATEGORY_LABELS: Record<DialogueCategory, string> = {
  silly_evil_boast: '1. Khoe "tội ác" ngớ ngẩn (100 câu)',
  welcome_new: '2. Chào người mới nhập môn (50 câu)',
  promotion: '3. Phong chức & nhận quà (50 câu)',
  disciple_interact: '4. Tương tác đồ đệ (40 câu)',
  minigame_host: '5. Điều hành Mini Game (40 câu)',
  minigame_win: '6. Nhận xét khi Thắng Mini Game (30 câu)',
  minigame_lose: '7. Nhận xét khi Thua Mini Game (30 câu)',
  elder_coleader: '8. Tương tác Trưởng Lão & Đồng Tôn (20 câu)',
  quiet_hall: '9. Khi đại điện vắng (20 câu)',
  throne_transfer: '10. Chuyển giao Ngai Vàng (20 câu)',
  diet_mon: '11. Đại Sự Kiện DIỆT MÔN 1.000 X (10 câu)',
};
