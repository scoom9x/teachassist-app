import Foundation
import Capacitor
import BackgroundTasks
import UserNotifications
import WidgetKit
import Security

final class GradeBridgeController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(GradeUpdatesPlugin()) }
}

@objc(GradeUpdatesPlugin)
public class GradeUpdatesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GradeUpdatesPlugin"
    public let jsName = "GradeUpdates"
    public let pluginMethods: [CAPPluginMethod] = ["configure", "publish", "permission", "clear"].map { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }
    @objc func configure(_ call: CAPPluginCall) {
        GradeRefresh.stateLock.lock(); defer { GradeRefresh.stateLock.unlock() }
        let minutes = call.getInt("minutes") ?? 0
        GradeRefresh.defaults.set(minutes >= 5 ? min(minutes, 1440) : 0, forKey: "minutes")
        GradeRefresh.defaults.set(call.getBool("notifications") ?? false, forKey: "notifications")
        GradeRefresh.defaults.set(call.getBool("hidden") ?? false, forKey: "hidden")
        if minutes >= 5, let user = call.getString("username"), let password = call.getString("password") {
            guard GradeRefresh.storeCredentials(["username":user,"password":password]) else { call.reject("Unable to securely store background credentials"); return }
        } else { GradeRefresh.removeCredentials() }
        GradeRefresh.schedule()
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
    @objc func publish(_ call: CAPPluginCall) {
        guard let courses = call.getArray("courses", JSObject.self) else { call.reject("Missing courses"); return }
        GradeRefresh.publish(courses, updated: call.getString("updated") ?? "", account: call.getString("account") ?? "", notify: call.getBool("notify") ?? false)
        call.resolve()
    }
    @objc func permission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in call.resolve(["granted":granted]) }
    }
    @objc func clear(_ call: CAPPluginCall) {
        GradeRefresh.stateLock.lock(); defer { GradeRefresh.stateLock.unlock() }
        GradeRefresh.removeCredentials()
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: GradeRefresh.taskID)
        for key in ["courses", "updated", "account", "minutes", "notifications"] { GradeRefresh.defaults.removeObject(forKey: key) }
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["grade-change"])
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["grade-change"])
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}

final class GradeRefresh: NSObject, URLSessionTaskDelegate {
    static let stateLock = NSRecursiveLock()
    static let taskID = "ca.local.teachassist.refresh"
    static let group = "group.ca.local.teachassist"
    static let defaults = UserDefaults(suiteName: group)!
    static let credentialService = "ca.local.teachassist.background"
    static func removeCredentials() { SecItemDelete([kSecClass:kSecClassGenericPassword,kSecAttrService:credentialService] as CFDictionary) }
    static func storeCredentials(_ value:[String:String]) -> Bool {
        guard let data = try? JSONSerialization.data(withJSONObject:value) else { return false }
        removeCredentials()
        return SecItemAdd([kSecClass:kSecClassGenericPassword,kSecAttrService:credentialService,kSecAttrAccount:"login",kSecAttrAccessible:kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,kSecValueData:data] as CFDictionary,nil) == errSecSuccess
    }
    static func credentials() -> [String:String]? {
        var result:CFTypeRef?
        guard SecItemCopyMatching([kSecClass:kSecClassGenericPassword,kSecAttrService:credentialService,kSecReturnData:true,kSecMatchLimit:kSecMatchLimitOne] as CFDictionary,&result) == errSecSuccess, let data=result as? Data else {return nil}
        return (try? JSONSerialization.jsonObject(with:data)) as? [String:String]
    }
    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier:taskID,using:nil) { task in
            schedule()
            let work = Task {
                do { try await run(); task.setTaskCompleted(success:true) }
                catch { task.setTaskCompleted(success:false) }
            }
            task.expirationHandler = { work.cancel() }
        }
    }
    static func schedule() {
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier:taskID)
        let minutes=defaults.integer(forKey:"minutes")
        guard minutes>=5 else {return}
        let request=BGAppRefreshTaskRequest(identifier:taskID)
        request.earliestBeginDate=Date(timeIntervalSinceNow:Double(max(15,minutes)*60))
        try? BGTaskScheduler.shared.submit(request)
    }
    func urlSession(_ session:URLSession, task:URLSessionTask, willPerformHTTPRedirection response:HTTPURLResponse, newRequest request:URLRequest, completionHandler:@escaping(URLRequest?)->Void) {
        completionHandler(request.url?.host == "ta.yrdsb.ca" && request.url?.scheme == "https" ? request : nil)
    }
    static func matches(_ pattern:String,_ text:String) -> [[String]] {
        guard let re=try? NSRegularExpression(pattern:pattern,options:[.caseInsensitive,.dotMatchesLineSeparators]) else{return []}
        let s=text as NSString
        return re.matches(in:text,range:NSRange(location:0,length:s.length)).map { m in (0..<m.numberOfRanges).map { m.range(at:$0).location == NSNotFound ? "" : s.substring(with:m.range(at:$0)) } }
    }
    static func plain(_ html:String)->String {
        html.replacingOccurrences(of:"<[^>]+>",with:" ",options:.regularExpression).replacingOccurrences(of:"&nbsp;",with:" ").replacingOccurrences(of:"&amp;",with:"&").trimmingCharacters(in:.whitespacesAndNewlines)
    }
    static func parse(_ html:String)throws->[[String:Any]] {
        guard html.contains("Student Reports"), !html.contains("name=\"password\"") else {throw URLError(.userAuthenticationRequired)}
        var courses:[[String:Any]]=[]
        for row in matches("<tr\\b[^>]*>(.*?)</tr>",html) {
            let cells=matches("<td\\b[^>]*>(.*?)</td>",row[1])
            guard cells.count == 3 else {continue}
            let code=plain(cells[0][1]).components(separatedBy:":")[0].trimmingCharacters(in:.whitespacesAndNewlines)
            guard plain(cells[0][1]).contains("Block:"), !code.isEmpty, !code.hasPrefix("LUNCH") else {continue}
            let id=matches("subject_id=(\\d+)",cells[2][1]).first?[1] ?? "unavailable-\(courses.count)"
            var course:[String:Any]=["id":id,"code":code]
            for (key,pattern) in [("mark","current mark\\s*=\\s*([0-9.]+)\\s*%"),("midterm","MIDTERM MARK:\\s*([0-9.]+)\\s*%"),("final","FINAL MARK:\\s*([0-9.]+)\\s*%")] {
                if let value=matches(pattern,plain(cells[2][1])).first?[1], let number=Double(value), number>=0,number<=100 {course[key]=number} else {course[key]=NSNull()}
            }
            courses.append(course)
        }
        guard !courses.isEmpty else {throw URLError(.cannotParseResponse)}
        return courses
    }
    static func run()async throws {
        guard let credentials=credentials(), let user=credentials["username"], let password=credentials["password"] else {return}
        let delegate=GradeRefresh()
        let config=URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest=20
        let session=URLSession(configuration:config,delegate:delegate,delegateQueue:nil)
        defer {session.invalidateAndCancel()}
        var request=URLRequest(url:URL(string:"https://ta.yrdsb.ca/yrdsb/index.php")!)
        request.httpMethod="POST"
        var body=URLComponents(); body.queryItems=[URLQueryItem(name:"username",value:user),URLQueryItem(name:"password",value:password),URLQueryItem(name:"subject_id",value:"0"),URLQueryItem(name:"submit",value:"login")]
        request.httpBody=body.percentEncodedQuery?.replacingOccurrences(of:"+",with:"%2B").data(using:.utf8)
        request.setValue("application/x-www-form-urlencoded",forHTTPHeaderField:"Content-Type")
        var html=""
        for _ in 0..<6 {
            try Task.checkCancellation()
            let (data,response)=try await session.data(for:request)
            guard let response=response as? HTTPURLResponse, response.statusCode != 401, response.statusCode != 403 else {throw URLError(.badServerResponse)}
            html=String(data:data,encoding:.utf8) ?? ""
            if html.contains("Student Reports") {break}
            guard (200..<300).contains(response.statusCode) else {throw URLError(.badServerResponse)}
            guard let redirect=matches("(?:window\\.|top\\.|document\\.)?location(?:\\.href)?\\s*=\\s*['\"]([^'\"]+)['\"]",html).first?[1], let url=URL(string:redirect,relativeTo:response.url)?.absoluteURL, url.host == "ta.yrdsb.ca",url.scheme == "https" else {throw URLError(.userAuthenticationRequired)}
            request=URLRequest(url:url)
        }
        let courses=try parse(html)
        try Task.checkCancellation()
        // A sign-out or account change while the request was in flight invalidates it.
        finishBackground(courses, user:user)
    }
    static func finishBackground(_ courses:[[String:Any]],user:String) {
        stateLock.lock(); defer {stateLock.unlock()}
        guard credentials()?["username"] == user, defaults.integer(forKey:"minutes")>=5 else {return}
        publish(courses,updated:ISO8601DateFormatter().string(from:Date()),account:user,notify:true)
    }
    static func publish(_ courses:[[String:Any]],updated:String,account:String,notify:Bool) {
        stateLock.lock(); defer {stateLock.unlock()}
        let old=defaults.data(forKey:"courses").flatMap{try? JSONSerialization.jsonObject(with:$0)} as? [[String:Any]]
        let sameAccount=defaults.string(forKey:"account") == account
        var changed=false
        if sameAccount, let old=old {
            for course in courses {
                if let before=old.first(where:{$0["code"] as? String == course["code"] as? String}) {
                    if ["mark","midterm","final"].contains(where:{ (before[$0] as? NSNumber)?.doubleValue != (course[$0] as? NSNumber)?.doubleValue }) {changed=true}
                }
            }
        }
        let enriched = courses.map { course -> [String:Any] in
            var next = course
            if next["assessments"] == nil, sameAccount {
                next["assessments"] = old?.first(where: { $0["id"] as? String == course["id"] as? String })?["assessments"]
            }
            return next
        }
        defaults.set(try? JSONSerialization.data(withJSONObject:enriched),forKey:"courses")
        defaults.set(updated,forKey:"updated");defaults.set(account,forKey:"account")
        WidgetCenter.shared.reloadAllTimelines()
        if changed && notify && defaults.bool(forKey:"notifications") {
            let content=UNMutableNotificationContent();content.title="Grades updated";content.body="Your TeachAssist course grades changed. Open the app to see the latest marks.";content.sound = .default
            UNUserNotificationCenter.current().add(UNNotificationRequest(identifier:"grade-change",content:content,trigger:nil))
        }
    }
}
